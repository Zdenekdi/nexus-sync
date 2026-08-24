import React, { useState } from 'react';
import { Landmark, Copy, Check, Clock, X } from 'lucide-react';

/**
 * Platební pokyny pro převod.
 *
 * Klíčová věc je variabilní symbol: párování jde výhradně přes něj, takže
 * když ho zákazník neopíše, platba dorazí a nikdo ji nespáruje. Proto má
 * vlastní řádek, tlačítko na zkopírování a výslovné upozornění.
 *
 * Druhá klíčová věc je čas. Karta zapne plán hned, převod ne — a kdo to
 * nečeká, hlásí to jako rozbitou aplikaci. Proto se tu píše, že se předplatné
 * zapne až po připsání.
 */
function Radek({ popisek, hodnota, zvyraznit = false, kopirovat = true, lang }) {
  const [zkopirovano, setZkopirovano] = useState(false);
  const jeCz = lang === 'cz';

  const kopie = async () => {
    try {
      await navigator.clipboard.writeText(String(hodnota));
      setZkopirovano(true);
      setTimeout(() => setZkopirovano(false), 1800);
    } catch {
      // Schránka může být zakázaná (http, oprávnění). Hodnota je vidět
      // a jde opsat ručně, takže se tu nic nehlásí.
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      padding: '0.75rem 0.9rem', borderRadius: 10,
      background: zvyraznit ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.03)',
      border: zvyraznit ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 2, letterSpacing: '0.04em' }}>{popisek}</div>
        <div style={{ fontWeight: 800, fontSize: zvyraznit ? '1.05rem' : '0.95rem', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
          {hodnota}
        </div>
      </div>
      {kopirovat && (
        <button
          type="button"
          onClick={kopie}
          aria-label={jeCz ? `Zkopírovat ${popisek}` : `Copy ${popisek}`}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
            color: zkopirovano ? '#22c55e' : 'var(--text-secondary)', padding: '0.45rem',
            cursor: 'pointer', flexShrink: 0, display: 'flex',
          }}
        >
          {zkopirovano ? <Check size={15} /> : <Copy size={15} />}
        </button>
      )}
    </div>
  );
}

export default function BankTransferInstructions({ pokyny, onClose, lang = 'cz' }) {
  if (!pokyny) return null;
  const jeCz = lang === 'cz';
  const splatnost = pokyny.splatnostDo ? new Date(pokyny.splatnostDo) : null;

  return (
    <div data-testid="bank-transfer-instructions" style={{
      border: '1px solid rgba(59,130,246,0.28)', borderRadius: 16, padding: '1.4rem',
      background: 'rgba(59,130,246,0.04)', marginTop: '1.2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <Landmark size={20} color="var(--accent-color)" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
            {jeCz ? 'Zaplaťte převodem' : 'Pay by bank transfer'}
          </h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={jeCz ? 'Zavřít' : 'Close'}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={17} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <Radek lang={lang} popisek={jeCz ? 'Číslo účtu' : 'Account number'} hodnota={pokyny.ucet} />
        <Radek lang={lang} popisek={jeCz ? 'Variabilní symbol' : 'Payment reference'} hodnota={pokyny.variabilniSymbol} zvyraznit />
        <Radek lang={lang} popisek={jeCz ? 'Částka' : 'Amount'} hodnota={`${pokyny.castka} ${pokyny.mena}`} />
        {pokyny.iban && <Radek lang={lang} popisek="IBAN" hodnota={pokyny.iban} />}
        {pokyny.prijemce && <Radek lang={lang} popisek={jeCz ? 'Příjemce' : 'Beneficiary'} hodnota={pokyny.prijemce} kopirovat={false} />}
      </div>

      <p style={{
        marginTop: '1.1rem', marginBottom: 0, padding: '0.85rem 1rem',
        borderLeft: '3px solid var(--accent-color)', background: 'rgba(255,255,255,0.03)',
        fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)',
      }}>
        {jeCz
          ? 'Variabilní symbol je povinný — platby se párují výhradně podle něj. Bez něj platbu nespárujeme automaticky.'
          : 'The payment reference is required — payments are matched by it alone. Without it we cannot match your payment automatically.'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <Clock size={15} style={{ flexShrink: 0 }} />
        <span>
          {jeCz
            ? `Plán se zapne po připsání platby, obvykle do jednoho pracovního dne.${splatnost ? ` Objednávka platí do ${splatnost.toLocaleDateString('cs-CZ')}.` : ''}`
            : `Your plan activates once the payment arrives, usually within one business day.${splatnost ? ` This order is valid until ${splatnost.toLocaleDateString('en-GB')}.` : ''}`}
        </span>
      </div>
    </div>
  );
}
