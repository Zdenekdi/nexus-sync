import React, { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

/**
 * Oznámení o příchozí SMS, které se samo zavře.
 *
 * Relay je zařízení, které nikdo neobsluhuje. Celoobrazovkové modální okno
 * u každé zprávy tam nedává smysl: překryje obsah, čeká na zavření a při
 * několika zprávách za sebou se hromadí. Proto tenhle proužek — objeví se,
 * po chvíli zmizí a nic neblokuje.
 *
 * Odpovídat jde dál: klepnutím se otevře plné okno s odpovědí. Tím se ta
 * možnost neztrácí, jen se nevnucuje.
 *
 * Props:
 *   sms       { from, body, timestamp } | null
 *   onOpen    () => void   — klepnutí: otevři plné okno s odpovědí
 *   onClose   () => void   — zavření (ruční i automatické)
 *   trvaniMs  jak dlouho zůstat; 0 = nezavírat samo
 */
export default function IncomingSmsToast({ sms, onOpen, onClose, lang = 'cz', trvaniMs = 8000 }) {
  const [odchazi, setOdchazi] = useState(false);

  useEffect(() => {
    if (!sms || !trvaniMs) return undefined;
    setOdchazi(false);

    // Nejdřív se spustí animace zmizení, teprve pak se stav vyčistí — jinak
    // proužek zmizí skokem uprostřed čtení.
    const doOdchodu = setTimeout(() => setOdchazi(true), Math.max(0, trvaniMs - 400));
    const doZavreni = setTimeout(() => onClose?.(), trvaniMs);
    return () => { clearTimeout(doOdchodu); clearTimeout(doZavreni); };
  }, [sms, trvaniMs, onClose]);

  if (!sms) return null;

  const jeCz = lang === 'cz';
  const nahled = String(sms.body || '').slice(0, 120);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="incoming-sms-toast"
      onClick={() => onOpen?.()}
      style={{
        position: 'fixed',
        top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        left: '0.75rem',
        right: '0.75rem',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '14px',
        background: 'rgba(15, 23, 42, 0.97)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        color: 'white',
        cursor: 'pointer',
        opacity: odchazi ? 0 : 1,
        transform: odchazi ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <MessageSquare size={18} color="var(--accent-color)" style={{ flexShrink: 0, marginTop: 2 }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 2 }}>
          {sms.from || (jeCz ? 'Neznámé číslo' : 'Unknown number')}
        </div>
        <div style={{
          fontSize: '0.8rem',
          color: 'rgba(226,232,240,0.85)',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {nahled}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {jeCz ? 'Klepnutím odpovíte' : 'Tap to reply'}
        </div>
      </div>

      <button
        aria-label={jeCz ? 'Zavřít oznámení' : 'Dismiss notification'}
        onClick={(e) => { e.stopPropagation(); onClose?.(); }}
        style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          padding: '0.2rem', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
