// Zámek nedodělaných / neověřených funkcí.
//
// Cíl: funkce, které ještě nejsou 100% funkční a otestované, se v aplikaci ukážou
// UZAMČENÉ s hláškou — ať na ně uživatelé nespoléhají. U BEZPEČNOSTNÍCH funkcí je
// to zásadní (modelka nesmí věřit, že ji appka sleduje, když to není ověřené).
//
// Zámek NEjen skryje UI, ale volající vypnou i reálné chování (viz isFeatureLocked
// v gatingu).
//
// STAV ZÁMKŮ řídí App Owner z aplikace (bez nasazení): server drží stav v DB a
// klient si ho při startu načte přes GET /admin/feature-locks a nasype sem přes
// setLockOverrides(). Default (než dorazí server / u neznámého klíče) = ZAMČENO
// (fail-closed) — bezpečnější „nespoléhej na to".
//
// App Owner vidí zamčené funkce ODEMČENÉ (aby je mohl otestovat) — bypass zapíná
// setAppOwnerBypass(true); UI k tomu ukazuje odznak „zamčeno pro uživatele".

import { useSyncExternalStore } from 'react';

// Registr zamykatelných funkcí + texty hlášky. KLÍČE musí sedět se serverovým
// server/src/config/featureLocks.js.
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
  // Hlasové SOS — přepínač zatím jen požádá o mikrofon a uloží stream; žádná
  // detekce bezpečnostního slova ani spuštění SOS neexistuje. Spolehlivé
  // rozpoznávání na pozadí je samostatný projekt (nativní engine + baterie + OEM).
  'voice-sos': {
    title: 'Hlasové SOS',
    note: 'Rozpoznávání bezpečnostního slova se teprve staví. Použij tlačítko SOS nebo check-in.',
  },

  'gsm-call-bridge': {
    title: 'Přímý GSM audio most',
    note: 'Přímé přemostění zvuku hovoru se testuje. Používej přesměrování na VoIP.',
  },
};

// ── Stav zámků (module-level store, čitelný synchronně odkudkoli) ──────────────
let _overrides = {};   // { [key]: boolean } ze serveru (true = zamčeno)
let _bypass = false;   // App Owner vidí funkce odemčené (test/náhled)
const _listeners = new Set();

function _notify() {
  _listeners.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
}

// Nastaví serverový stav zámků (volající předává celý objekt { key: bool }).
export function setLockOverrides(obj) {
  _overrides = obj && typeof obj === 'object' ? { ...obj } : {};
  _notify();
}

// Zapne/vypne App-Owner bypass (owner vidí zamčené funkce odemčené).
export function setAppOwnerBypass(on) {
  const next = !!on;
  if (next !== _bypass) { _bypass = next; _notify(); }
}

export function subscribeLocks(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

// Je funkce fakticky zamčená PRO BĚŽNÉ UŽIVATELE? (ignoruje App-Owner bypass —
// pro odznak „zamčeno pro uživatele" a pro admin UI).
export function isLockedForUsers(key) {
  if (!Object.prototype.hasOwnProperty.call(LOCKED_FEATURES, key)) return false;
  const ov = _overrides[key];
  return ov === undefined ? true : ov; // default: zamčeno (fail-closed)
}

// Je funkce zamčená pro AKTUÁLNÍHO uživatele? App Owner ji má odemčenou (bypass).
export function isFeatureLocked(key) {
  if (_bypass) return false;
  return isLockedForUsers(key);
}

export function getLockInfo(key) {
  return LOCKED_FEATURES[key] || null;
}

// Seznam zamykatelných funkcí (pro admin UI): [{ key, title, note }]
export function getLockableFeatures() {
  return Object.entries(LOCKED_FEATURES).map(([key, info]) => ({ key, ...info }));
}

// ── React hooky (reaktivní — přepnutí zámku živě překreslí) ────────────────────
export function useFeatureLock(key) {
  return useSyncExternalStore(subscribeLocks, () => isFeatureLocked(key));
}

export function useLockedForUsers(key) {
  return useSyncExternalStore(subscribeLocks, () => isLockedForUsers(key));
}
