/**
 * Párování plateb převodem proti výpisu z Fio banky.
 *
 * Napsáno podle „FIO API BANKOVNICTVÍ", verze 1.9 (16. 10. 2025):
 *   https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
 *
 * Spouští se z cronService každých 10 minut. Sám se vypne, když převod není
 * zapnutý nebo chybí token, takže na nasazení bez banky jen zapíše řádek.
 */
const axios = require('axios');
const billingController = require('../controllers/billingController');
const logger = require('../services/logger');
const { sendAlert } = require('../services/alertService');

// Token se čte až při běhu, ne při načtení modulu. Kdyby se přečetl nahoře,
// stačilo by, aby se modul načetl dřív než dotenv, a worker by mlčky
// přeskakoval napořád — s hláškou „token není nastavený", i když nastavený je.
// Zároveň to znamená, že výměna tokenu nevyžaduje restart.
const dejToken = () => process.env.FIO_API_TOKEN;

// Kolik dní zpátky se čte. Záměrně se čte překrývající se okno místo koncového
// bodu `/last/` se zarážkou: ten při každém dotazu posune zarážku na serveru,
// takže kdyby zpracování po stažení selhalo, pohyby jsou nenávratně pryč
// a platba by se nespárovala nikdy. Opakované čtení je proti tomu neškodné —
// aktivace hledá jen předplatné ve stavu PENDING, takže podruhé neudělá nic.
const DNU_ZPET = 3;

// Nad 90 dní vyžaduje API zvláštní autorizaci v internetovém bankovnictví
// a jinak vrací 422 (dokumentace §8.7). Sem se to nikdy nemá dostat, ale
// kdyby někdo DNU_ZPET zvedl, ať to řekne kód, ne banka.
const MAX_DNU_ZPET = 90;

/**
 * Mapování sloupců JSON výpisu (dokumentace §5.3.1.6, „Struktura
 * transactionList"). Čísla NEJSOU pořadová — column0 je datum, column22 je ID
 * pohybu. Bez téhle tabulky vypadá `tx.column5` jako překlep.
 */
const SLOUPEC = {
  ID_POHYBU: 'column22',   // jedinečné číslo pohybu
  DATUM: 'column0',
  OBJEM: 'column1',        // záporný u odchozích plateb
  MENA: 'column14',
  VS: 'column5',
  PROTIUCET: 'column2',
  TYP: 'column8',
};

const hodnota = (tx, klic) => tx?.[SLOUPEC[klic]]?.value ?? null;

const naDatum = (d) => d.toISOString().split('T')[0];

/**
 * Chybové stavy podle dokumentace §8. Rozlišují se schválně: 409 znamená
 * „zeptal ses moc rychle" a spraví se sám, kdežto 500 znamená neplatný token
 * a sám se nespraví nikdy.
 */
function popisChyby(status) {
  switch (status) {
    case 404: return { text: 'Špatně sestavený dotaz (404) — zkontroluj URL.', vazne: true };
    case 409: return { text: 'Dotazy na token jsou častější než 30 s (409). Přeskakuji, další pokus za 10 minut.', vazne: false };
    case 413: return { text: 'Výpis přesáhl 50 000 pohybů (413) — zkrať období.', vazne: true };
    case 422: return { text: 'Požadována data starší 90 dní bez zvláštní autorizace (422).', vazne: true };
    case 500: return { text: 'Fio odmítlo token (500). Podle dokumentace §8.4 to znamená NEPLATNÝ NEBO NEAKTIVNÍ TOKEN — platnost je nejvýš 180 dní. Platby převodem se do výměny tokenu NEPÁRUJÍ.', vazne: true };
    default:  return { text: `Neočekávaná odpověď (${status}).`, vazne: true };
  }
}

async function syncFioTransactions() {
  if (process.env.ALLOW_BANK_TRANSFER_BILLING !== 'true') {
    logger.info('[FioWorker] Platby převodem nejsou zapnuté, přeskakuji.');
    return { preskoceno: true };
  }
  const token = dejToken();
  if (!token) {
    logger.warn('[FioWorker] FIO_API_TOKEN není nastavený — platby se automaticky nepárují, zbývá ruční potvrzení.');
    return { preskoceno: true };
  }
  if (DNU_ZPET > MAX_DNU_ZPET) {
    logger.error(`[FioWorker] DNU_ZPET=${DNU_ZPET} přesahuje limit ${MAX_DNU_ZPET} dní; API by vrátilo 422.`);
    return { preskoceno: true };
  }

  const doDne = naDatum(new Date());
  const odDne = naDatum(new Date(Date.now() - DNU_ZPET * 24 * 60 * 60 * 1000));

  // Dokumentace §5.2.1. Dřív se tu volal starší hostitel www.fio.cz/ib_api/rest,
  // který v dokumentaci k verzi 1.9 už není uvedený.
  const url = `https://fioapi.fio.cz/v1/rest/periods/${token}/${odDne}/${doDne}/transactions.json`;

  let odpoved;
  try {
    odpoved = await axios.get(url, { timeout: 30000, validateStatus: () => true });
  } catch (error) {
    // Síťová chyba se spraví sama při dalším běhu, takže se jen zapíše.
    logger.error(`[FioWorker] Spojení s Fio selhalo: ${error.message}`);
    return { chyba: 'network' };
  }

  if (odpoved.status !== 200) {
    const { text, vazne } = popisChyby(odpoved.status);
    logger.error(`[FioWorker] ${text}`);
    if (vazne) {
      // Bez tohohle je výpadek párování neviditelný: zákazníci platí, nic se
      // nezapíná a jediná stopa je řádek v logu, do kterého nikdo nekouká.
      // Přesně takhle tiše umřel relay a přišlo se na to až po hodinách.
      // try/catch, ne `.catch()`: hlášení poruchy nesmí shodit worker, ani
      // kdyby sendAlert selhal synchronně nebo nevrátil promise.
      try {
        await sendAlert(`Párování plateb převodem nefunguje.\n\n${text}`, 'error');
      } catch (e) {
        logger.error(`[FioWorker] Nepodařilo se odeslat upozornění: ${e.message}`);
      }
    }
    return { chyba: odpoved.status };
  }

  const pohyby = odpoved.data?.accountStatement?.transactionList?.transaction || [];

  // Jen příchozí platby. Objem je u odchozích záporný (§5.3.1.6) a odchozí
  // platba s náhodou shodným VS nemá co aktivovat.
  const prichozi = pohyby.filter((tx) => Number(hodnota(tx, 'OBJEM')) > 0);
  logger.info(`[FioWorker] ${odDne}–${doDne}: ${pohyby.length} pohybů, z toho ${prichozi.length} příchozích`);

  let sparovano = 0;
  for (const tx of prichozi) {
    const vs = hodnota(tx, 'VS');
    if (!vs) continue;   // bez VS se platba spárovat nedá

    const castka = Number(hodnota(tx, 'OBJEM'));
    const mena = hodnota(tx, 'MENA');
    const idPohybu = hodnota(tx, 'ID_POHYBU');

    const vysledek = await billingController._activateSubscription(String(vs), true, {
      provider: 'fio',
      providerStatus: `fio_movement_${idPohybu || 'unknown'}`,
      amount: castka,
      currency: mena,
    });

    if (vysledek.success) {
      sparovano += 1;
      logger.info(`[FioWorker] Spárováno: VS ${vs}, ${castka} ${mena}, pohyb ${idPohybu}`);
    } else {
      // Nejčastější důvod je, že platba už spárovaná byla — okno se překrývá,
      // takže se stejný pohyb čte několik dní po sobě. Proto jen info.
      logger.info(`[FioWorker] Nespárováno: VS ${vs}, ${castka} ${mena} — ${vysledek.message}`);
    }
  }

  return { celkem: pohyby.length, prichozi: prichozi.length, sparovano };
}

if (require.main === module) {
  syncFioTransactions().then(() => process.exit(0));
}

module.exports = { syncFioTransactions, SLOUPEC };
