// socketBridge — drží aktuální socket.io instanci MIMO `window`.
//
// Dřív byl socket na `window._nexusSocket`, což je globál dosažitelný jakýmkoli
// skriptem ve stránce (včetně XSS payloadu → emit/listen jako přihlášený uživatel).
// Modulová proměnná je uzavřená v closure bundlu — cizí skript ji z `window`
// nevytáhne. Zároveň slouží jako most mezi variantami aplikace (full app používá
// NexusContext, relay app RelayContext) — obě zapíšou socket sem přes setSocket,
// takže sdílené komponenty (např. RelayMode) ho dostanou v obou.
import { useSyncExternalStore } from 'react';

let currentSocket = null;
const listeners = new Set();

export function setSocket(socket) {
  currentSocket = socket || null;
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore listener error */ }
  }
}

export function getSocket() {
  return currentSocket;
}

export function subscribeSocket(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// React hook: vrací aktuální socket a překreslí konzumenta, jakmile se socket
// objeví/změní (nahrazuje dřívější „počkej na window._nexusSocket" polling).
// useSyncExternalStore je přesně pro tenhle případ (external store mimo React).
export function useSocketBridge() {
  return useSyncExternalStore(subscribeSocket, getSocket, getSocket);
}
