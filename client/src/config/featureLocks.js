// Zámek nedodělaných / neověřených funkcí.
//
// Cíl: funkce, které ještě nejsou 100% funkční a otestované, se v aplikaci ukážou
// UZAMČENÉ s hláškou — ať na ně uživatelé nespoléhají. U BEZPEČNOSTNÍCH funkcí je
// to zásadní (modelka nesmí věřit, že ji appka sleduje, když to není ověřené).
//
// Zámek NEjen skryje UI, ale volající vypnou i reálné chování (viz isFeatureLocked
// v gatingu). Odemčení = odebrání klíče odsud, až je funkce ověřená.
//
// (Zatím statické. Lze později převést na DB-driven přepínač pro app ownera.)

export const LOCKED_FEATURES = {
  // Telefon jako GPS tracker — kód hotový, ale běh na pozadí NENÍ ověřený na
  // reálném zařízení (MIUI killing, oprávnění „vždy", doze). Bezpečnostní funkce.
  'phone-tracking': {
    title: 'Sledování polohy telefonem',
    note: 'Funkce se dokončuje a testuje na zařízeních. Zatím na ni prosím nespoléhej.',
  },

  // Automatické postování na externí weby (adultwork/amateri/onlyfans) — selektory
  // jsou hádané a neověřené proti živým stránkám; rozbijí se při změně webu.
  'web-automation': {
    title: 'Automatizace webových profilů',
    note: 'Automatické postování se ještě dolaďuje a testuje. Zatím není spolehlivé.',
  },

  // Fyzické GPS+SIM trackery přes Traccar — endpoint je otestovaný, ale end-to-end
  // s reálným trackerem a nasazeným Traccarem zatím neproběhl.
  'physical-tracker': {
    title: 'Fyzické GPS trackery',
    note: 'Napojení fyzického trackeru (Traccar) se dokončuje. Použij zatím telefon.',
  },

  // Přímý most zvuku GSM hovoru (bez SIP) — neověřené; produkčně se jede přes
  // přesměrování na VoIP číslo.
  'gsm-call-bridge': {
    title: 'Přímý GSM audio most',
    note: 'Přímé přemostění zvuku hovoru se testuje. Používej přesměrování na VoIP.',
  },
};

export function isFeatureLocked(key) {
  return Object.prototype.hasOwnProperty.call(LOCKED_FEATURES, key);
}

export function getLockInfo(key) {
  return LOCKED_FEATURES[key] || null;
}
