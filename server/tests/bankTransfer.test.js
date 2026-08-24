/**
 * Platba převodem.
 *
 * Aktivační polovina (`_activateSubscription` s VS) a fioSyncWorker v repu už
 * byly. Chyběla objednávka: `createCheckoutSession` každý převod odmítal
 * a nikdo nikdy nespouštěl worker, takže i s nastaveným tokenem by se
 * nespárovalo nic.
 *
 * Nejdůležitější věc, kterou tenhle soubor hlídá, je částka. Párování jde
 * výhradně přes variabilní symbol, který je veřejný — kdyby se neověřovalo,
 * kolik peněz doopravdy přišlo, stačí poslat korunu se správným VS a mít
 * plán Agency.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/services/db');
jest.mock('../src/services/socket');
jest.mock('../src/services/logger');
jest.mock('../src/services/alertService');
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));

const prismaMock = require('../src/services/db');
const app = require('../src/app');
const billingController = require('../src/controllers/billingController');

const AGENTURA = 'agency-1';

function token(role = { name: 'Agency Admin', isManager: true, isAppOwner: false }) {
  return jwt.sign({ userId: 'user-1', agencyId: AGENTURA, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}
const tokenOwnera = () => token({ name: 'App Owner', isManager: true, isAppOwner: true });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ALLOW_BANK_TRANSFER_BILLING = 'true';
  delete process.env.FIO_API_TOKEN;
  prismaMock.user.findUnique.mockResolvedValue({
    tokenVersion: 0, role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
  });
  prismaMock.subscription.findFirst.mockResolvedValue(null);
  prismaMock.subscription.create.mockImplementation(async ({ data }) => ({
    id: 'sub-1', createdAt: new Date(), ...data,
  }));
});

afterAll(() => { delete process.env.ALLOW_BANK_TRANSFER_BILLING; });

describe('objednávka převodem', () => {
  it('vrátí platební pokyny s účtem, částkou a variabilním symbolem', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planId: 'pro_monthly', paymentMethod: 'transfer', currency: 'CZK' });

    expect(res.status).toBe(200);
    expect(res.body.paymentMethod).toBe('transfer');
    expect(res.body.pokyny).toMatchObject({
      ucet: '2703576806/2010',
      castka: 990,
      mena: 'CZK',
    });
    expect(String(res.body.pokyny.variabilniSymbol)).toMatch(/^\d{1,10}$/);
  });

  it('NEAKTIVUJE předplatné, jen ho zařadí jako čekající', async () => {
    // Objednávka není platba. Kdyby se plán zapnul hned, stačilo by ho
    // objednat převodem a nikdy nezaplatit.
    await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planId: 'agency_monthly', paymentMethod: 'transfer', currency: 'CZK' });

    const data = prismaMock.subscription.create.mock.calls[0][0].data;
    expect(data.status).toBe('PENDING');
    expect(data.provider).toBe('bank_transfer');
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('uloží OČEKÁVANOU částku — na ní stojí kontrola při párování', async () => {
    await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planId: 'starter_monthly', paymentMethod: 'transfer', currency: 'CZK' });

    const data = prismaMock.subscription.create.mock.calls[0][0].data;
    expect(data.amountPaid).toBe(290);
    expect(data.currency).toBe('CZK');
  });

  it('opakované kliknutí nevyrobí druhý variabilní symbol', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({
      id: 'sub-1', agencyId: AGENTURA, plan: 'Professional', status: 'PENDING',
      provider: 'bank_transfer', paymentRef: '1234567890', amountPaid: 990,
      currency: 'CZK', note: JSON.stringify({ dueAt: '2026-09-01T00:00:00.000Z' }),
    });

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planId: 'pro_monthly', paymentMethod: 'transfer', currency: 'CZK' });

    expect(res.body.pokyny.variabilniSymbol).toBe('1234567890');
    expect(prismaMock.subscription.create).not.toHaveBeenCalled();
  });

  it('vypnutý převod se nenabízí (kontrolní vzorek)', async () => {
    // Fail-closed. Vystavit platební pokyny na nasazení, kde platby nikdo
    // nepáruje, znamená vybrat peníze a nezapnout službu.
    process.env.ALLOW_BANK_TRANSFER_BILLING = 'false';

    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planId: 'pro_monthly', paymentMethod: 'transfer', currency: 'CZK' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('bank_transfer_disabled');
  });

  it('platba kartou zůstává beze změny (kontrolní vzorek)', async () => {
    // Nejsnazší způsob, jak tuhle změnu pokazit, je poslat do bankovní větve
    // i karty. Stripe není v testu nastavený, takže sem musí dorazit jeho
    // chyba — ne platební pokyny k převodu.
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planId: 'pro_monthly', paymentMethod: 'card', currency: 'CZK' });

    expect(res.body.pokyny).toBeUndefined();
  });
});

describe('párování podle variabilního symbolu', () => {
  const cekajici = {
    id: 'sub-1', agencyId: AGENTURA, plan: 'Agency', status: 'PENDING',
    provider: 'bank_transfer', paymentRef: '1234567890',
    amountPaid: 2490, currency: 'CZK', expiresAt: new Date('2026-12-01'),
    note: JSON.stringify({ type: 'plan', targetValue: 'Agency' }),
    agency: { id: AGENTURA, extraFeatures: null },
  };

  beforeEach(() => {
    prismaMock.subscription.findFirst.mockResolvedValue(cekajici);
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.subscription.update.mockResolvedValue({});
    prismaMock.agency.update.mockResolvedValue({});
  });

  it('správná částka plán aktivuje', async () => {
    const r = await billingController._activateSubscription('1234567890', true, {
      provider: 'fio', amount: 2490, currency: 'CZK',
    });
    expect(r.success).toBe(true);
    expect(prismaMock.agency.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { plan: 'Agency', tier: 'Agency' } })
    );
  });

  it('koruna se správným VS plán NEAKTIVUJE', async () => {
    // Jádro věci. VS je veřejný údaj — je na výpisu, dá se odhadnout i
    // opsat. Kdyby stačil k aktivaci, je to obejití placení.
    const r = await billingController._activateSubscription('1234567890', true, {
      provider: 'fio', amount: 1, currency: 'CZK',
    });
    expect(r.success).toBe(false);
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('platba v jiné měně neprojde', async () => {
    const r = await billingController._activateSubscription('1234567890', true, {
      provider: 'fio', amount: 2490, currency: 'HUF',
    });
    expect(r.success).toBe(false);
    expect(prismaMock.agency.update).not.toHaveBeenCalled();
  });

  it('bez známé částky se neaktivuje nic', async () => {
    const r = await billingController._activateSubscription('1234567890', true, { provider: 'fio' });
    expect(r.success).toBe(false);
  });
});

describe('ruční potvrzení převodu', () => {
  beforeEach(() => {
    prismaMock.auditLog.findFirst.mockResolvedValue(null);
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  it('Agency Admin potvrdit nesmí', async () => {
    // Kdyby směl, potvrdil by si vlastní platbu sám a placení by bylo
    // dobrovolné.
    prismaMock.user.findUnique.mockResolvedValue({
      tokenVersion: 0, role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
    });

    const res = await request(app)
      .post('/api/billing/bank-transfers/confirm')
      .set('Authorization', `Bearer ${token()}`)
      .send({ subscriptionId: 'sub-1' });

    expect(res.status).toBe(403);
  });

  it('App Owner potvrdí a zapíše se to do auditu', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      tokenVersion: 0, role: { name: 'App Owner', isManager: true, isAppOwner: true },
    });
    prismaMock.subscription.findFirst
      .mockResolvedValueOnce({
        id: 'sub-1', agencyId: AGENTURA, status: 'PENDING', provider: 'bank_transfer',
        paymentRef: '1234567890', amountPaid: 990, currency: 'CZK', plan: 'Professional',
      })
      .mockResolvedValueOnce({
        id: 'sub-1', agencyId: AGENTURA, status: 'PENDING', paymentRef: '1234567890',
        amountPaid: 990, currency: 'CZK', expiresAt: new Date('2026-12-01'),
        note: JSON.stringify({ type: 'plan', targetValue: 'Professional' }),
        agency: { id: AGENTURA, extraFeatures: null },
      });
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.subscription.update.mockResolvedValue({});
    prismaMock.agency.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/billing/bank-transfers/confirm')
      .set('Authorization', `Bearer ${tokenOwnera()}`)
      .send({ subscriptionId: 'sub-1' });

    expect(res.status).toBe(200);
    // Bez záznamu není stopa o tom, kdo peníze prohlásil za přijaté.
    const zapis = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(zapis.action).toBe('BANK_TRANSFER_CONFIRMED');
    expect(zapis.details).toContain('1234567890');
  });

  it('seznam čekajících vidí jen App Owner', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      tokenVersion: 0, role: { name: 'Agency Admin', isManager: true, isAppOwner: false },
    });
    const res = await request(app)
      .get('/api/billing/bank-transfers')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(403);
  });
});
