import React, { useState } from 'react';
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, Clock } from 'lucide-react';

/**
 * IncomingCallModal
 *
 * UI popup zobrazující příchozí GSM hovor operátorovi v prohlížeči.
 * Zobrazí se automaticky, když relay telefon zachytí příchozí hovor.
 *
 * Props:
 *   incomingCall   — { callerId, callId } nebo null
 *   callState      — 'idle' | 'ringing' | 'active' | 'holding' | 'ended'
 *   callDuration   — počet sekund (zobrazí se jako MM:SS)
 *   onAnswer()     — uživatel kliknul Přijmout
 *   onReject()     — uživatel kliknul Odmítnout
 *   onHangup()     — uživatel kliknul Zavěsit
 *   onMute(bool)   — ztlumení mikrofonu
 *   onSpeaker(bool) — reproduktor
 */
const IncomingCallModal = ({
  incomingCall,
  callState,
  callDuration = 0,
  onAnswer,
  onReject,
  onHangup,
  onMute,
  onSpeaker,
}) => {
  const [isMuted,   setIsMuted]   = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  if (!incomingCall && callState === 'idle') return null;

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    onMute?.(next);
  };

  const handleSpeaker = () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    onSpeaker?.(next);
  };

  const isRinging = callState === 'ringing';
  const isActive  = callState === 'active';

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}>
        {/* Modal karta */}
        <div style={{
          width: '90%',
          maxWidth: '380px',
          background: 'linear-gradient(145deg, rgba(15,17,23,0.98), rgba(20,22,30,0.98))',
          border: `1px solid ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}`,
          borderRadius: '28px',
          padding: '2rem',
          boxShadow: `0 40px 80px rgba(0,0,0,0.8), 0 0 40px ${isActive ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.15)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Avatar / ikona */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isActive
              ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
            border: `2px solid ${isActive ? 'rgba(34,197,94,0.5)' : 'rgba(99,102,241,0.5)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isRinging ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}>
            <PhoneCall size={32} color={isActive ? '#22c55e' : '#818cf8'} />
          </div>

          {/* Stav */}
          <div style={{ textAlign: 'center', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: '800',
              letterSpacing: '0.15em',
              color: isActive ? '#22c55e' : '#818cf8',
              textTransform: 'uppercase',
            }}>
              {isRinging ? '🔔 Příchozí hovor' : isActive ? '📞 Hovor aktivní' : 'Hovor'}
            </div>

            {/* Číslo volajícího */}
            <div style={{
              fontSize: '1.4rem',
              fontWeight: '900',
              color: 'white',
              letterSpacing: '-0.02em',
            }}>
              {incomingCall?.callerId || 'Neznámé číslo'}
            </div>

            {/* Délka hovoru (pokud aktivní) */}
            {isActive && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.9rem',
              }}>
                <Clock size={14} />
                {formatDuration(callDuration)}
              </div>
            )}
          </div>

          {/* Ovládání během aktivního hovoru */}
          {isActive && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
            }}>
              {/* Ztlumit */}
              <button
                onClick={handleMute}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: isMuted
                    ? 'rgba(239,68,68,0.2)'
                    : 'rgba(255,255,255,0.08)',
                  color: isMuted ? '#ef4444' : 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title={isMuted ? 'Odztlumit' : 'Ztlumit'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Reproduktor */}
              <button
                onClick={handleSpeaker}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: isSpeaker
                    ? 'rgba(99,102,241,0.3)'
                    : 'rgba(255,255,255,0.08)',
                  color: isSpeaker ? '#818cf8' : 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title={isSpeaker ? 'Sluchátko' : 'Reproduktor'}
              >
                {isSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          )}

          {/* Hlavní akční tlačítka */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            width: '100%',
            justifyContent: 'center',
          }}>
            {/* Odmítnout / Zavěsit */}
            <button
              onClick={isActive ? onHangup : onReject}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
                transition: 'all 0.2s',
                transform: 'scale(1)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title={isActive ? 'Zavěsit' : 'Odmítnout'}
            >
              <PhoneOff size={26} />
            </button>

            {/* Přijmout (jen když vyzvání) */}
            {isRinging && (
              <button
                onClick={onAnswer}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
                  transition: 'all 0.2s',
                  transform: 'scale(1)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Přijmout"
              >
                <PhoneCall size={26} />
              </button>
            )}
          </div>

          {/* Tip: relay telefon */}
          <div style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            Hovor přijat přes GSM relay · Zvuk přes WebRTC
          </div>
        </div>
      </div>

      {/* CSS animace */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50%       { box-shadow: 0 0 0 12px transparent; opacity: 0.85; }
        }
      `}</style>
    </>
  );
};

export default IncomingCallModal;
