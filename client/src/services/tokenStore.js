/**
 * tokenStore — jediný zdroj pravdy pro access token a per-device relay secret.
 *
 * Bezpečnost (#5 / H4): na WEBU tyto tajnosti žijí POUZE v paměti (module scope),
 * nikdy ne v localStorage/sessionStorage — takže je XSS payload nemůže vytáhnout
 * z perzistentního úložiště. Po reloadu se access token znovu získá přes
 * /auth/refresh (httpOnly refresh cookie).
 *
 * Nativní (Capacitor) aplikace tajnosti perzistuje do localStorage jako dřív:
 *   - relay app nemá refresh flow ani httpOnly cookie, takže by jinak po restartu
 *     appky vypadla z přihlášení;
 *   - útočná plocha je výrazně menší (WebView načítá jen zabundlované lokální
 *     assety přes capacitor://localhost, žádný cizí/injektovaný obsah);
 *   - relay secret je na zařízení navíc už šifrovaný v nativním úložišti (#9).
 */
import { Capacitor } from '@capacitor/core';

// Na nativu perzistujeme (viz výše), na webu držíme jen v paměti.
const PERSIST = (() => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
})();

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
