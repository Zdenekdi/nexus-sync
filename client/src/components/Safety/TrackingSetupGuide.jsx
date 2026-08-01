import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { MapPin, Bell, BatteryCharging, Rocket, Check, AlertTriangle, RefreshCw, X } from 'lucide-react';
import {
  getTrackingReadiness,
  isReadinessBlocking,
  requestLocationPermission,
  openAppSettings,
  requestBatteryExemption,
  openAutostartSettings,
} from '../../services/trackingReadiness';

/**
 * TrackingSetupGuide — průvodce nastavením sledování polohy na pozadí.
 *
 * Sledování se tiše zastaví, když chybí kterákoli systémová podmínka (poloha
 * „vždy", oznámení, výjimka z optimalizace baterie, na MIUI/EMUI navíc autostart).
 * U bezpečnostní funkce je tiché selhání nepřijatelné, takže než sledování
 * zapneme, provedeme uživatele nastavením a řekneme, co konkrétně ještě chybí.
 *
 * Stav se přepočítá po každém návratu do aplikace — uživatel odchází přepínat
 * do systémového nastavení a vrací se zpátky.
 */
export default function TrackingSetupGuide({ isCz = true, onClose, onReady }) {
  const [readiness, setReadiness] = useState(null);
  const [checking, setChecking] = useState(true);
  const [autostartVisited, setAutostartVisited] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    const r = await getTrackingReadiness();
    setReadiness(r);
    setChecking(false);
    return r;
  }, []);

  // Úvodní načtení: stav nastavíme až v .then (ne synchronně v těle efektu).
  useEffect(() => {
    let cancelled = false;
    getTrackingReadiness().then((r) => {
      if (cancelled) return;
      setReadiness(r);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Po návratu ze systémového nastavení stav přepočítej.
  useEffect(() => {
    let listener;
    CapacitorApp.addListener('appStateChange', (state) => {
      if (state?.isActive) refresh();
    }).then((l) => { listener = l; }).catch(() => {});
    return () => { try { listener?.remove(); } catch { /* ignore */ } };
  }, [refresh]);

  const blocking = isReadinessBlocking(readiness);

  const steps = readiness ? [
    {
      key: 'location',
      done: readiness.fineLocation && readiness.backgroundLocation,
      icon: MapPin,
      title: isCz ? 'Poloha — „Povolit vždy"' : 'Location — "Allow all the time"',
      note: isCz
        ? 'Bez volby „vždy" se sledování zastaví, jakmile aplikaci zavřeš.'
        : 'Without "all the time", tracking stops as soon as the app is closed.',
      action: readiness.fineLocation ? openAppSettings : requestLocationPermission,
      actionLabel: readiness.fineLocation
        ? (isCz ? 'Otevřít nastavení' : 'Open settings')
        : (isCz ? 'Povolit polohu' : 'Allow location'),
    },
    {
      key: 'notifications',
      done: readiness.notifications,
      icon: Bell,
      title: isCz ? 'Oznámení' : 'Notifications',
      note: isCz
        ? 'Sledování běží jako trvalé oznámení — bez něj ho systém ukončí.'
        : 'Tracking runs as an ongoing notification — without it the system kills it.',
      action: openAppSettings,
      actionLabel: isCz ? 'Otevřít nastavení' : 'Open settings',
    },
    {
      key: 'battery',
      done: readiness.batteryUnrestricted,
      icon: BatteryCharging,
      title: isCz ? 'Baterie bez omezení' : 'Unrestricted battery',
      note: isCz
        ? 'Úsporný režim jinak sledování na pozadí uspí.'
        : 'Battery saver otherwise suspends background tracking.',
      action: requestBatteryExemption,
      actionLabel: isCz ? 'Povolit' : 'Allow',
    },
    ...(readiness.autostartSupported ? [{
      key: 'autostart',
      // Autostart nejde z aplikace přečíst — bereme jako hotové, když ho uživatel otevřel.
      done: autostartVisited,
      unverifiable: true,
      icon: Rocket,
      title: isCz ? 'Autostart' : 'Autostart',
      note: isCz
        ? `Na zařízeních ${readiness.manufacturer || 'této značky'} je potřeba povolit spouštění na pozadí. Stav bohužel nejde ověřit z aplikace — zkontroluj prosím, že je Nexus Hub povolený.`
        : `On ${readiness.manufacturer || 'this brand'} devices background start must be enabled. We can't read this state — please confirm Nexus Hub is enabled.`,
      action: async () => { await openAutostartSettings(); setAutostartVisited(true); },
      actionLabel: isCz ? 'Otevřít autostart' : 'Open autostart',
    }] : []),
  ] : [];

  // Portál do <body>: dialog je vnořený v kartě s `backdrop-filter` (.glass-card),
  // což vytváří kotvicí blok pro position:fixed — overlay se pak nekotvil k oknu
  // a potvrzovací tlačítko končilo mimo obrazovku.
  //
  // z-index musí být nad plovoucím chatem (9001) i spodní navigací (5000), jinak
  // lišta překryje spodek dialogu. Pozadí karty je záměrně NEprůhledné: přes glass
  // efekt prosvítal obsah pod dialogem.
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div
        data-testid="tracking-setup-guide"
        className="fade-in"
        style={{
          width: '100%', maxWidth: '460px', padding: '1.5rem',
          // Výška z overlaye (ten kryje okno), NE z 100vh — ve WebView se vh
          // vyhodnocuje proti jinému viewportu a dialog pak přetekl přes obrazovku.
          maxHeight: '100%', minHeight: 0, overflowY: 'auto',
          background: '#111827', borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <MapPin size={22} color="#3b82f6" />
            {isCz ? 'Nastavení sledování polohy' : 'Location tracking setup'}
          </h3>
          <button onClick={onClose} aria-label={isCz ? 'Zavřít' : 'Close'}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 0, marginBottom: '1.25rem' }}>
          {isCz
            ? 'Aby tvoji polohu viděl operátor i při zhasnuté obrazovce, potřebuje aplikace pár oprávnění. Bez nich by se sledování tiše zastavilo.'
            : 'So the operator can see your location even with the screen off, the app needs a few permissions. Without them tracking would stop silently.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem',
                borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${s.done ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {s.done
                    ? <Check size={18} color="#4ade80" />
                    : <Icon size={18} color={s.unverifiable ? '#f59e0b' : 'var(--text-secondary)'} />}
                </div>
                {/* Tlačítko pod textem, ne vedle něj — vedle by na mobilu zmáčklo
                    popisek do několikaslovného sloupce. */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>{s.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 2 }}>{s.note}</div>
                  {!s.done && (
                    <button onClick={s.action} style={{
                      marginTop: '0.6rem', border: 'none', borderRadius: '9px', cursor: 'pointer',
                      padding: '0.45rem 0.8rem', fontSize: '0.72rem', fontWeight: 800,
                      background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    }}>{s.actionLabel}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {blocking && !checking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.72rem', color: '#fbbf24' }}>
            <AlertTriangle size={14} />
            {isCz ? 'Dokud něco chybí, sledování nezapneme.' : "We won't enable tracking while something is missing."}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
          <button onClick={refresh} disabled={checking} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            flex: '0 0 auto', padding: '0.7rem 0.9rem', borderRadius: '11px', cursor: checking ? 'default' : 'pointer',
            border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--text-secondary)',
            fontSize: '0.75rem', fontWeight: 700,
          }}>
            <RefreshCw size={14} className={checking ? 'spinning' : undefined} />
            {isCz ? 'Zkontrolovat' : 'Re-check'}
          </button>
          <button
            onClick={() => onReady && onReady()}
            disabled={blocking || checking}
            data-testid="tracking-setup-enable"
            style={{
              flex: 1, padding: '0.7rem 1rem', borderRadius: '11px', border: 'none',
              cursor: (blocking || checking) ? 'not-allowed' : 'pointer',
              background: (blocking || checking) ? 'rgba(255,255,255,0.08)' : '#22c55e',
              color: (blocking || checking) ? 'var(--text-secondary)' : 'white',
              fontSize: '0.8rem', fontWeight: 800,
            }}>
            {isCz ? 'Zapnout sledování' : 'Enable tracking'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
