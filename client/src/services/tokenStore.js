/**
 * tokenStore — jediný zdroj pravdy pro access token a per-device relay secret.
 *
 * POZN. (#5 / H4): Cílem bylo držet access token na WEBU jen v paměti, aby ho XSS
 * nemohl vytáhnout z localStorage; po reloadu ho obnovit přes httpOnly refresh
 * cookie. To ale v SOUČASNÉ topologii NEFUNGUJE: web běží na jiné registrovatelné
 * doméně (…web.app) než API (…myvnc.com), takže refresh cookie je z pohledu
 * prohlížeče THIRD-PARTY a moderní prohlížeče ji cross-site blokují (Safari ITP
 * vždy, Chrome čím dál víc) — bez ohledu na SameSite=None. Memory-only token pak
 * po reloadu nemá jak session obnovit → uživatel se okamžitě odhlásí.
 *
 * Proto tokenStore zatím PERZISTUJE i na webu (jako dřív). Memory-only variantu
 * půjde zapnout, až bude API dostupné pod stejným originem jako web (reverse proxy
 * / stejná doména), kdy je refresh cookie first-party. Viz [[h4-token-store]].
 *
 * Nativní (Capacitor) app perzistuje také (relay app nemá refresh flow ani cookie,
 * jinak by po restartu vypadla z přihlášení; útočná plocha WebView je malá a relay
 * secret je na zařízení navíc šifrovaný v nativním úložišti — #9).
 */

// Zatím perzistujeme na všech platformách (viz poznámka výše). Přepnout na
// `Capacitor.isNativePlatform()` až bude web + API same-origin.
const PERSIST = true;

const TOKEN_KEY = 'nexus_token';
const SECRET_KEY = 'nexus_relay_device_secret';

function readPersisted(key) {
  if (!PERSIST) return null;
  try { return localStorage.getItem(key) || null; } catch { return null; }
}

function writePersisted(key, val) {
  if (!PERSIST) return;
  try {
    if (val) localStorage.setItem(key, val);
    else localStorage.removeItem(key);
  } catch { /* storage nedostupné — držíme aspoň v paměti */ }
}

let accessToken = readPersisted(TOKEN_KEY);
let relaySecret = readPersisted(SECRET_KEY);
const listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try { fn(accessToken); } catch { /* ignore listener errors */ }
  }
}

export function getToken() { return accessToken; }

export function setToken(t) {
  accessToken = t || null;
  writePersisted(TOKEN_KEY, accessToken);
  emit();
}

export function getRelaySecret() { return relaySecret; }

export function setRelaySecret(s) {
  relaySecret = s || null;
  writePersisted(SECRET_KEY, relaySecret);
}

export function clear() {
  accessToken = null;
  relaySecret = null;
  writePersisted(TOKEN_KEY, null);
  writePersisted(SECRET_KEY, null);
  emit();
}

/** Přihlásí posluchače na změnu tokenu; vrací odhlašovací funkci. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export default { getToken, setToken, getRelaySecret, setRelaySecret, clear, subscribe };
