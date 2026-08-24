/**
 * Bankovní spojení pro platbu převodem.
 *
 * Číslo účtu není tajemství — patří na fakturu a do platebních pokynů —, ale
 * v konfiguraci je schválně: účet se může změnit a přepsat ho v env je otázka
 * minuty, kdežto v sestaveném klientském balíčku by to znamenalo nové nasazení.
 *
 * Výchozí hodnota je tu proto, aby se nedalo omylem vystavit platební pokyny
 * s prázdným účtem. Kdyby chyběla, `undefined` by se v pokynech vykreslilo
 * jako prázdný řádek a zákazník by poslal peníze nikam.
 */

const UCET = process.env.BANK_ACCOUNT_NUMBER || '2703576806/2010';
const NAZEV_BANKY = process.env.BANK_NAME || 'Fio banka, a.s.';
const IBAN = process.env.BANK_IBAN || '';
const BIC = process.env.BANK_BIC || 'FIOBCZPPXXX';
const PRIJEMCE = process.env.BANK_ACCOUNT_HOLDER || '';

// Kolik dní má zákazník na zaplacení, než čekající objednávka propadne.
// Bez propadnutí by nezaplacené objednávky zůstávaly ve frontě k ručnímu
// potvrzení napořád a mezi nimi by zanikly ty skutečné.
const SPLATNOST_DNI = Number(process.env.BANK_TRANSFER_DUE_DAYS || 14);

// Bankovní převod se nabízí, jen když je výslovně zapnutý. Fail-closed:
// nabídnout převod dřív, než je čím platby párovat, znamená vybrat peníze
// a nezapnout službu.
const jeZapnuty = () => process.env.ALLOW_BANK_TRANSFER_BILLING === 'true';

// Fio API umí platby párovat samo. Bez tokenu zbývá ruční potvrzení.
const maAutomatickeParovani = () => Boolean(process.env.FIO_API_TOKEN);

/** Údaje, které se posílají klientovi. Nikdy sem nepatří FIO_API_TOKEN. */
const bankovniUdaje = () => ({
  ucet: UCET,
  banka: NAZEV_BANKY,
  iban: IBAN || null,
  bic: BIC || null,
  prijemce: PRIJEMCE || null,
  splatnostDni: SPLATNOST_DNI,
});

/**
 * Variabilní symbol. V ČR maximálně 10 číslic, jinak ho banka odmítne nebo
 * ořízne — a oříznutý VS se nespáruje s ničím.
 *
 * Skládá se z času a náhody, ne z pořadového čísla: pořadové číslo by
 * prozrazovalo, kolik má služba objednávek. Jedinečnost si stejně ověřuje
 * volající proti databázi.
 */
function vygenerujVS(nahoda = Math.random) {
  const cas = Date.now() % 10_000_000;              // 7 číslic
  const zbytek = Math.floor(nahoda() * 1000);       // 3 číslice
  return `${cas}${String(zbytek).padStart(3, '0')}`;
}

module.exports = { bankovniUdaje, jeZapnuty, maAutomatickeParovani, vygenerujVS, SPLATNOST_DNI };
