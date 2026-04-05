/**
 * OperatorCallScreen.jsx — Fullscreen overlay pro operátora
 * Desktop-first design, tmavý gradient, pulzující kruh, timer
 */
import { useState, useEffect } from 'react';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ── Sdílené styly ─────────────────────────────────────────────────────────────

const overlay = {
  position: 'fixed', inset: 0, zIndex: 10000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(20,10,40,0.97) 100%)',
  backdropFilter: 'blur(16px)',
  animation: 'opFadeIn 0.35s ease-out',
};

const card = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: '1.25rem', padding: '2.5rem 2rem', maxWidth: '360px', width: '100%',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
};

const avatarWrap = {
  position: 'relative', width: '100px', height: '100px',
};

const avatarCircle = (color = '#6366f1') => ({
  width: '80px', height: '80px', borderRadius: '50%',
  background: `linear-gradient(135deg, ${color}33, ${color}18)`,
  border: `2px solid ${color}55`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '2rem', color: '#fff', position: 'absolute',
  top: '10px', left: '10px',
  boxShadow: `0 0 0 0 ${color}44`,
});

const pulseRing = (color = '#6366f1') => ({
  position: 'absolute', inset: 0, borderRadius: '50%',
  background: 'transparent',
  border: `2px solid ${color}55`,
  animation: 'opPulse 1.6s ease-out infinite',
});

const labelStyle = { fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase' };
const callerStyle = { fontSize: '1.6rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' };
const subStyle    = { fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' };
const timerStyle  = { fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' };

const STYLES = `
@keyframes opFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
@keyframes opPulse  { 0% { transform:scale(1); opacity:0.8; } 100% { transform:scale(1.6); opacity:0; } }
`;

// ── Kruhové tlačítko ──────────────────────────────────────────────────────────

function CircleBtn({ onClick, color, icon, size = '64px', label }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: hov ? color : `${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', transition: 'all 0.18s', transform: hov ? 'scale(1.08)' : 'scale(1)',
          outline: 'none',
        }}
        title={label}
      >{icon}</button>
      {label && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{label}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IncomingOperatorCall — zobrazen při příchozím hovoru (čeká na přijetí)
// ═══════════════════════════════════════════════════════════════════════════════

export function IncomingOperatorCall({ callerId, callerName, targetModel, onAnswer, onReject }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(v => v + 1), 500); return () => clearInterval(t); }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div style={overlay}>
        <div style={card}>
          {/* Pulzující avatar */}
          <div style={avatarWrap}>
            <div style={pulseRing('#22c55e')} />
            <div style={{ ...pulseRing('#22c55e'), animationDelay: '0.5s' }} />
            <div style={avatarCircle('#22c55e')}>📞</div>
          </div>

          {/* Info */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...labelStyle, color: '#22c55e', marginBottom: '0.5rem' }}>
              🔔 Příchozí hovor {tick % 2 === 0 ? '●' : '○'}
            </div>
            <div style={callerStyle}>{callerName || callerId}</div>
            {callerName && callerName !== callerId && (
              <div style={{ ...subStyle, marginTop: '0.25rem' }}>{callerId}</div>
            )}

          {/* Jméno modelky — klíčová informace pro operátora */}
          {targetModel && (
            <div style={{
              padding: '0.4rem 1.2rem', borderRadius: '20px',
              background: 'linear-gradient(135deg, #22c55e22, #16a34a22)',
              border: '1px solid #22c55e55',
              fontSize: '0.95rem', fontWeight: '800', color: '#86efac',
              letterSpacing: '0.04em',
            }}>
              👩‍🏫 Hovor pro: <span style={{ color: '#4ade80' }}>{targetModel}</span>
            </div>
          )}

          {!targetModel && (
            <div style={{ ...subStyle }}>📞 SIP relay hovor</div>
          )}
          </div>

          {/* Akce */}
          <div style={{ display: 'flex', gap: '2.5rem', marginTop: '0.5rem' }}>
            <CircleBtn onClick={onReject}  color="#ef4444" icon="📵" label="Odmítnout" />
            <CircleBtn onClick={onAnswer}  color="#22c55e" icon="📞" label="Přijmout"  size="72px" />
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ActiveOperatorCall — aktivní hovor s timerem, mute, zavěšení
// ═══════════════════════════════════════════════════════════════════════════════

export function ActiveOperatorCall({ callerId, callerName, targetModel, duration = 0, isMuted, onHangup, onToggleMute }) {
  return (
    <>
      <style>{STYLES}</style>
      <div style={overlay}>
        <div style={card}>
          {/* Avatar */}
          <div style={avatarWrap}>
            <div style={avatarCircle('#6366f1')}>🎙</div>
          </div>

          {/* Info */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...labelStyle, color: '#6366f1', marginBottom: '0.5rem' }}>
              ✅ Probíhá hovor
            </div>
            <div style={callerStyle}>{callerName || callerId}</div>
            {callerName && callerName !== callerId && (
              <div style={{ ...subStyle, marginTop: '0.25rem' }}>{callerId}</div>
            )}
            <div style={{ ...timerStyle, marginTop: '0.75rem', fontSize: '1.4rem' }}>{fmt(duration)}</div>
          </div>

          {/* Jméno modelky */}
          {targetModel && (
            <div style={{
              padding: '0.4rem 1.2rem', borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366f122, #4f46e522)',
              border: '1px solid #6366f155',
              fontSize: '0.9rem', fontWeight: '800', color: '#a5b4fc',
            }}>
              👩‍🏫 <span style={{ color: '#c4b5fd' }}>{targetModel}</span>
            </div>
          )}

          {/* Badge audio */}
          <div style={{
            padding: '0.25rem 0.75rem', borderRadius: '8px',
            background: '#6366f122', border: '1px solid #6366f144',
            fontSize: '0.72rem', fontWeight: '800', color: '#a5b4fc',
          }}>
            🔊 WebRTC Audio {isMuted ? '(mute)' : 'aktivní'}
          </div>

          {/* Akce */}
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
            <CircleBtn
              onClick={onToggleMute}
              color={isMuted ? '#ef4444' : '#6b7280'}
              icon={isMuted ? '🔇' : '🎤'}
              label={isMuted ? 'Unmute' : 'Mute'}
            />
            <CircleBtn onClick={onHangup} color="#ef4444" icon="📵" label="Zavěsit" size="72px" />
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OperatorSipStatus — malý badge v dashboardu (stav registrace)
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_COLOR = {
  registered:   '#22c55e',
  connected:    '#84cc16',
  connecting:   '#f59e0b',
  failed:       '#ef4444',
  disconnected: '#6b7280',
  idle:         '#6b7280',
};

const STATUS_LABEL = {
  registered:   'SIP připojen',
  connected:    'SIP připojuje',
  connecting:   'SIP připojuje…',
  failed:       'SIP chyba',
  disconnected: 'SIP odpojen',
  idle:         'SIP neaktivní',
};

export function OperatorSipStatus({ status, onClick }) {
  const color = STATUS_COLOR[status] || '#6b7280';
  const label = STATUS_LABEL[status] || status;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: `${color}18`, border: `1px solid ${color}44`,
        borderRadius: '8px', padding: '0.3rem 0.75rem', cursor: 'pointer',
        color, fontSize: '0.75rem', fontWeight: '700',
        transition: 'all 0.2s',
      }}
      title="Klikněte pro nastavení SIP"
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block',
                     boxShadow: status === 'registered' ? `0 0 6px ${color}` : 'none' }} />
      {label}
    </button>
  );
}
