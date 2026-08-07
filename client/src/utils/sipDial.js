/**
 * Složení cíle odchozího hovoru.
 *
 * Dialplan Asterisku čeká `<DID>*<číslo klienta>`; prefix rozhoduje, jaké
 * číslo klient uvidí. Číslo volajícího si ale nevybírá prohlížeč — server
 * generuje pravidlo jen pro DID, které je v databázi, takže cokoli jiného
 * hovor rovnou položí. Tahle funkce tedy nechrání server, jen brání tomu,
 * abychom mu poslali nesmysl a operátorka slyšela jen zavěšení.
 *
 * Hvězdička je oddělovač. Kdyby prošla v čísle klienta, rozpadl by se cíl
 * na jiném místě, než čekáme — proto se odmítá.
 */

/** Odstraní to, co lidé do čísel píší pro čitelnost. */
export function normalizujCislo(vstup) {
  if (typeof vstup !== 'string' && typeof vstup !== 'number') return '';
  // \s nechytá nezlomitelnou mezeru všude stejně, proto ji vypisuju zvlášť.
  return String(vstup).replace(/[\s\u00A0\u202F\-().]/g, '');
}

const E164 = /^\+?[1-9]\d{5,17}$/;

/**
 * @returns {{ ok: true, cil: string } | { ok: false, duvod: string }}
 *   `duvod` je klíč, ne text pro uživatele — překlad patří do UI.
 */
export function sestavOdchoziCil(did, cisloKlienta) {
  const zDid = normalizujCislo(did);
  const zCislo = normalizujCislo(cisloKlienta);

  if (!zDid) return { ok: false, duvod: 'chybiDid' };
  if (!zCislo) return { ok: false, duvod: 'chybiCislo' };
  if (!E164.test(zDid)) return { ok: false, duvod: 'nepouzitelneDid' };
  if (!E164.test(zCislo)) return { ok: false, duvod: 'nepouzitelneCislo' };

  return { ok: true, cil: `${zDid}*${zCislo}` };
}

/** DID profilu ze seznamu z `GET /sip/dids`. */
export function najdiDidProfilu(dids, profileId) {
  if (!Array.isArray(dids) || !profileId) return null;
  const nalez = dids.find(d => String(d?.profileId) === String(profileId));
  return nalez?.number || null;
}
