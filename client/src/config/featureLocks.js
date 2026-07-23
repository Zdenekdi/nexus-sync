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
};

export function isFeatureLocked(key) {
  return Object.prototype.hasOwnProperty.call(LOCKED_FEATURES, key);
}

export function getLockInfo(key) {
  return LOCKED_FEATURES[key] || null;
}
