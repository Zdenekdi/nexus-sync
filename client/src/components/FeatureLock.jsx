import React from 'react';
import { useFeatureLock, getLockInfo } from '../config/featureLocks';

/**
 * FeatureLock — když je funkce uzamčená (viz config/featureLocks.js), vykreslí
 * místo children hlášku „ve vývoji / testuje se". Jinak vykreslí children beze změny.
 *
 * Stav zámku je reaktivní: když ho App Owner přepne v adminu, překreslí se živě.
 * App Owner má bypass → vidí children (funkci může otestovat).
 *
 * Použití:
 *   <FeatureLock featureKey="phone-tracking"><MojeTlačítko/></FeatureLock>
 *
 * POZOR: tohle jen skryje UI. Reálné chování musí volající vypnout zvlášť přes
 * isFeatureLocked(...) (ať se u bezpečnostních funkcí opravdu nic nespustí).
 */
export default function FeatureLock({ featureKey, children, compact = false }) {
  const locked = useFeatureLock(featureKey);
  const info = getLockInfo(featureKey);
  if (!locked || !info) return children;

  return (
    <div
      role="note"
      aria-label={`${info.title} — ve vývoji`}
      style={{
        padding: compact ? '0.7rem 0.9rem' : '1rem',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        color: 'var(--text-secondary)',
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }} aria-hidden="true">🔒</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>{info.title}</div>
        <div style={{ fontSize: '0.7rem' }}>{info.note}</div>
      </div>
    </div>
  );
}
