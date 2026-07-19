// phoneTracker — telefon jako GPS tracker (real-time poloha modelky pro bezpečnost).
//
// Producent, který chyběl: server (/api/trackers/ingest + /pair-self) i mapa jsou
// hotové, jen nikdo neposílal data. Tady telefon:
//   1) se jednorázově spáruje jako tracker (self-pair, installationId = pseudo-IMEI),
//   2) přes @capacitor/geolocation sleduje polohu a posílá ji na /ingest.
//
// GATING (důležité): reportuje se JEN během aktivní schůzky/SOS, ne 24/7 — volající
// spouští start/stop podle SafetySession. Tady je jen mechanika, ne rozhodnutí „kdy".
//
// POZN.: watchPosition drží polohu ve FOREGROUNDU. Spolehlivý background (zhasnutá
// obrazovka) přidá nativní foreground service — samostatný krok. Viz [[phone-gps-tracker]].
import axios from 'axios';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const NexusRelay = registerPlugin('NexusRelay');

let ingestToken = null;
let ingestUrl = null;
let watchId = null;
let nativeTracking = false;
let lastSentAt = 0;

const MIN_SEND_INTERVAL_MS = 20000; // neposílat častěji než ~20 s (baterie + rate-limit)

// Jednorázově spáruje telefon jako tracker a uloží ingest token do paměti modulu.
export async function provisionPhoneTracker(apiBase, authToken, installationId) {
  const { data } = await axios.post(
    `${apiBase}/trackers/pair-self`,
    { installationId },
    { headers: { Authorization: `Bearer ${authToken}` }, timeout: 15000 }
  );
  ingestToken = data?.ingest?.token || null;
  // Použij URL ze serveru (odolné vůči path/prefix/proxy rozdílům); fallback z apiBase.
  ingestUrl = data?.ingest?.url || `${apiBase}/trackers/ingest`;
  return !!ingestToken;
}

async function sendPosition(position) {
  if (!ingestToken || !ingestUrl || !position?.coords) return;
  const now = Date.now();
  if (now - lastSentAt < MIN_SEND_INTERVAL_MS) return; // throttling
  lastSentAt = now;

  const c = position.coords;
  try {
    await axios.post(
      ingestUrl,
      {
        token: ingestToken,
        lat: c.latitude,
        lng: c.longitude,
        accuracy: c.accuracy ?? undefined,
        speedKph: typeof c.speed === 'number' && c.speed >= 0 ? c.speed * 3.6 : undefined,
        heading: typeof c.heading === 'number' && c.heading >= 0 ? c.heading : undefined,
        capturedAt: new Date(position.timestamp || now).toISOString(),
      },
      { timeout: 15000 }
    );
  } catch {
    // Necháme throttle okno i při chybě — jinak by se při výpadku serveru/offline
    // posílalo při každém watchPosition callbacku (baterie + zátěž serveru).
  }
}

// Spustí sledování polohy (foreground). Vyžaduje předchozí provisioning.
// Vrací true při úspěšném startu.
export async function startPhoneTracking() {
  if (!ingestToken || !ingestUrl) return false;

  try {
    const perm = await Geolocation.requestPermissions();
    if (perm && perm.location === 'denied' && perm.coarseLocation === 'denied') return false;
  } catch { /* na webu/bez pluginu jen zkusíme watchPosition */ }

  // Nativně: foreground service reportuje i na pozadí / se zhasnutou obrazovkou.
  if (Capacitor.isNativePlatform()) {
    try {
      await NexusRelay.startLocationTracking({ token: ingestToken, ingestUrl, minIntervalMs: MIN_SEND_INTERVAL_MS });
      nativeTracking = true;
      return true;
    } catch {
      nativeTracking = false; // fallback na foreground watchPosition níže
    }
  }

  // Web / fallback: foreground watchPosition (jen dokud je app v popředí).
  if (watchId) return true;
  try {
    watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
      (position, err) => { if (!err && position) sendPosition(position); }
    );
    return !!watchId;
  } catch {
    watchId = null;
    return false;
  }
}

export async function stopPhoneTracking() {
  if (nativeTracking) {
    try { await NexusRelay.stopLocationTracking(); } catch { /* ignore */ }
    nativeTracking = false;
  }
  if (watchId) {
    try { await Geolocation.clearWatch({ id: watchId }); } catch { /* ignore */ }
    watchId = null;
  }
}

export function isPhoneTracking() {
  return !!watchId || nativeTracking;
}

export function isProvisioned() {
  return !!ingestToken;
}

// Sjednocené „zapni sledování": provisionuje jen jednou za session, pak startuje.
// Gating volá tohle při zapnutí a stopPhoneTracking() při vypnutí.
export async function ensurePhoneTracking(apiBase, authToken, installationId) {
  if (!ingestToken) {
    const ok = await provisionPhoneTracker(apiBase, authToken, installationId);
    if (!ok) return false;
  }
  return startPhoneTracking();
}
