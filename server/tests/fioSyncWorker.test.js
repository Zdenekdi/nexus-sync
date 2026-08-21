/**
 * Párování plateb proti výpisu z Fio banky.
 *
 * Tvar odpovědi i čísla sloupců jsou opsané z dokumentace „FIO API
 * BANKOVNICTVÍ" v1.9, §5.3.1.6. Čísla nejsou pořadová — column0 je datum,
 * column1 objem, column5 variabilní symbol, column14 měna, column22 ID pohybu.
 * Kdyby se některé spletlo, párování by mlčky nenašlo nic: chybějící klíč
 * v JSON je `undefined`, ne výjimka.
 */

jest.mock('axios');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('../src/services/db');
jest.mock('../src/controllers/billingController', () => ({
  _activateSubscription: jest.fn(),
}));

const axios = require('axios');
const billingController = require('../src/controllers/billingController');
const { sendAlert } = require('../src/services/alertService');
const { syncFioTransactions } = require('../src/workers/fioSyncWorker');

/** Pohyb v tom tvaru, v jakém ho Fio opravdu vrací. */
function pohyb({ id = 1148734530, objem = 990, mena = 'CZK', vs = '1234567890' } = {}) {
  return {
    column22: { value: id, name: 'ID pohybu', id: 22 },
    column0: { value: 1340661600000, name: 'Datum', id: 0 },
    column1: { value: objem, name: 'Objem', id: 1 },
    column14: { value: mena, name: 'Měna', id: 14 },
    column5: vs === null ? null : { value: vs, name: 'VS', id: 5 },
    column8: { value: 'Příjem převodem uvnitř banky', name: 'Typ', id: 8 },
  };
}

const vypis = (transakce) => ({
  status: 200,
  data: { accountStatement: { info: { accountId: '2703576806' }, transactionList: { transaction: transakce } } },
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ALLOW_BANK_TRANSFER_BILLING = 'true';
  process.env.FIO_API_TOKEN = 'testovaci-token';
  billingController._activateSubscription.mockResolvedValue({ success: true });
});

afterAll(() => {
  delete process.env.ALLOW_BANK_TRANSFER_BILLING;
  delete process.env.FIO_API_TOKEN;
});

describe('čtení výpisu', () => {
  it('volá dokumentovaný koncový bod fioapi.fio.cz/v1/rest', async () => {
    // Dřív se tu volal starší hostitel www.fio.cz/ib_api/rest, který
    // v dokumentaci k v1.9 už není.
    axios.get.mockResolvedValue(vypis([]));
    await syncFioTransactions();

    const url = axios.get.mock.calls[0][0];
    expect(url).toContain('https://fioapi.fio.cz/v1/rest/periods/');
    expect(url).toMatch(/\/\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}\/transactions\.json$/);
  });

  it('přečte částku, měnu i variabilní symbol ze správných sloupců', async () => {
    axios.get.mockResolvedValue(vypis([pohyb({ objem: 2490, mena: 'CZK', vs: '9876543210' })]));
    await syncFioTransactions();

    expect(billingController._activateSubscription).toHaveBeenCalledWith(
      '9876543210', true, expect.objectContaining({ amount: 2490, currency: 'CZK', provider: 'fio' })
    );
  });

  it('odchozí platbu ignoruje', async () => {
    // Objem je u odchozích záporný. Odchozí platba s náhodou shodným VS
    // nemá co aktivovat — a kontrola částky by ji sice odmítla, jenže
    // spoléhat se na to je náhoda, ne návrh.
    axios.get.mockResolvedValue(vypis([pohyb({ objem: -990 })]));
    await syncFioTransactions();

    expect(billingController._activateSubscription).not.toHaveBeenCalled();
  });

  it('příchozí platbu ve stejném výpisu zpracuje (kontrolní vzorek)', async () => {
    // Bez tohohle by test výš prošel, i kdyby se ignorovalo úplně všechno.
    axios.get.mockResolvedValue(vypis([pohyb({ objem: -990 }), pohyb({ objem: 990, vs: '111' })]));
    await syncFioTransactions();

    expect(billingController._activateSubscription).toHaveBeenCalledTimes(1);
    expect(billingController._activateSubscription.mock.calls[0][0]).toBe('111');
  });

  it('platbu bez variabilního symbolu přeskočí', async () => {
    axios.get.mockResolvedValue(vypis([pohyb({ vs: null })]));
    await syncFioTransactions();
    expect(billingController._activateSubscription).not.toHaveBeenCalled();
  });
});

describe('chybové stavy podle dokumentace §8', () => {
  it('500 (neplatný token) hlásí nahlas, ne jen do logu', async () => {
    // Token má platnost nejvýš 180 dní, takže jednou vyprší. Když se to
    // nikde neozve, zákazníci platí a nic se nezapíná — a nikdo o tom neví.
    axios.get.mockResolvedValue({ status: 500, data: {} });
    const r = await syncFioTransactions();

    expect(r.chyba).toBe(500);
    expect(sendAlert).toHaveBeenCalledTimes(1);
    expect(sendAlert.mock.calls[0][0]).toMatch(/token/i);
  });

  it('409 (moc častý dotaz) nikoho nebudí', async () => {
    // Minimální interval na token je 30 s. Spraví se sám při dalším běhu,
    // takže z toho nemá být poplach.
    axios.get.mockResolvedValue({ status: 409, data: {} });
    const r = await syncFioTransactions();

    expect(r.chyba).toBe(409);
    expect(sendAlert).not.toHaveBeenCalled();
  });

  it('422 (data starší 90 dní) hlásí nahlas', async () => {
    axios.get.mockResolvedValue({ status: 422, data: {} });
    await syncFioTransactions();
    expect(sendAlert).toHaveBeenCalled();
  });

  it('výpadek sítě neshodí worker', async () => {
    axios.get.mockRejectedValue(new Error('ETIMEDOUT'));
    const r = await syncFioTransactions();
    expect(r.chyba).toBe('network');
  });
});

describe('vypnutý stav', () => {
  it('bez zapnutého převodu se na banku vůbec nesahá', async () => {
    process.env.ALLOW_BANK_TRANSFER_BILLING = 'false';
    await syncFioTransactions();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('bez tokenu se na banku vůbec nesahá', async () => {
    delete process.env.FIO_API_TOKEN;
    await syncFioTransactions();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
