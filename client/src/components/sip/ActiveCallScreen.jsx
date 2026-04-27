import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Hash, PhoneOff, ChevronDown
} from 'lucide-react';
import { NexusSip } from '../../plugins/NexusSip';

/**
 * ActiveCallScreen.jsx
 * Zobrazí se po přijetí SIP hovoru.
 *
 * Props:
 *   caller      {string}   — číslo / jméno
 *   profileName {string}   — název profilu
 *   onEnd       {function} — callback po zavěšení
 */
export default function ActiveCallScreen({ caller, profileName, onEnd }) {
  const [seconds,    setSeconds]    = useState(0);
  const [isMuted,    setIsMuted]    = useState(false);
  const [isSpeaker,  setIsSpeaker]  = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [dialInput,  setDialInput]  = useState('');
  const timerRef = useRef(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Akce ───────────────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    setIsMuted(next);
    try { await NexusSip.mute({ muted: next }); } catch (_err) { console.warn(_err); }
  }, [isMuted]);

  const toggleSpeaker = useCallback(async () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    try { await NexusSip.setSpeaker({ enabled: next }); } catch (_err) { console.warn(_err); }
  }, [isSpeaker]);

  const hangup = useCallback(async () => {
    clearInterval(timerRef.current);
    try { await NexusSip.hangup(); } catch (_err) { console.warn(_err); }
    onEnd?.();
  }, [onEnd]);

  const dialpadPress = (key) => setDialInput(d => d + key);

  const DIALPAD_KEYS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['*','0','#'],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .acs-root {
          position: fixed; inset: 0; z-index: 9990;
          display: flex; flex-direction: column; align-items: center;
          background: linear-gradient(170deg, #07090f 0%, #0b1120 40%, #060810 100%);
          font-family: 'Inter', sans-serif;
          animation: acsFade 0.3s ease-out;
          padding: env(safe-area-inset-top, 2rem) 1.5rem
                   max(env(safe-area-inset-bottom), 2rem) 1.5rem;
        }
        @keyframes acsFade { from { opacity: 0; transform: translateY(12px); } }

        /* ── Header ── */
        .acs-header {
          display: flex; flex-direction: column; align-items: center;
          padding-top: 3.5rem; flex: 0 0 auto; width: 100%;
        }
        .acs-sip-badge {
          font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em;
          color: #22c55e; text-transform: uppercase;
          padding: 0.2rem 0.65rem; border-radius: 6px;
          background: rgba(34,197,94,0.1); margin-bottom: 1rem;
        }
        .acs-avatar-wrap {
          width: 88px; height: 88px; border-radius: 50%;
          background: linear-gradient(135deg, #1e3356, #2563eb);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.25rem;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.2), 0 8px 32px rgba(37,99,235,0.3);
        }
        .acs-caller {
          font-size: 1.75rem; font-weight: 800; color: #f0f4ff;
          letter-spacing: -0.02em; text-align: center;
          margin-bottom: 0.3rem;
        }
        .acs-profile-tag {
          font-size: 0.78rem; color: rgba(160,175,210,0.65); margin-bottom: 0.25rem;
        }
        .acs-timer {
          font-size: 1.05rem; font-weight: 600; color: rgba(180,195,230,0.55);
          font-variant-numeric: tabular-nums; letter-spacing: 0.05em;
          margin-top: 0.15rem;
        }

        /* ── Dialpad overlay ── */
        .acs-dialpad-overlay {
          position: absolute; inset: 0; z-index: 100;
          background: rgba(4,6,14,0.97);
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 0;
          animation: acsFade 0.2s ease-out;
          padding-bottom: max(env(safe-area-inset-bottom), 2rem);
        }
        .acs-dialpad-input {
          font-size: 2rem; font-weight: 700; color: #e2e8ff;
          letter-spacing: 0.18em; min-height: 2.5rem;
          margin-bottom: 1.5rem; font-variant-numeric: tabular-nums;
        }
        .acs-dialpad-grid {
          display: grid; grid-template-columns: repeat(3, 72px);
          gap: 0.75rem; margin-bottom: 1.5rem;
        }
        .acs-dialbtn {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8ff; font-size: 1.3rem; font-weight: 700;
          cursor: pointer; transition: background 0.12s, transform 0.1s;
        }
        .acs-dialbtn:active { background: rgba(255,255,255,0.14); transform: scale(0.93); }
        .acs-dialpad-close {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(180,195,230,0.7); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .acs-dialpad-close:active { background: rgba(255,255,255,0.15); }

        /* ── Grid tlačítek ── */
        .acs-controls {
          flex: 1; display: flex; align-items: flex-end;
          width: 100%; max-width: 340px; padding-bottom: 1.5rem;
        }
        .acs-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto auto; gap: 1.1rem 1.5rem;
          width: 100%;
        }
        .acs-ctrl-btn {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.55rem; background: none; border: none; cursor: pointer;
          padding: 0; transition: transform 0.12s;
        }
        .acs-ctrl-btn:active { transform: scale(0.9); }

        .acs-ctrl-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .acs-ctrl-icon.active {
          background: rgba(37,99,235,0.18);
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 16px rgba(37,99,235,0.25);
        }
        .acs-ctrl-icon.active-red {
          background: rgba(220,38,38,0.18);
          border-color: rgba(220,38,38,0.5);
          box-shadow: 0 0 16px rgba(220,38,38,0.25);
        }
        .acs-ctrl-label {
          font-size: 0.7rem; font-weight: 600;
          color: rgba(160,175,210,0.65); letter-spacing: 0.04em;
        }

        /* ── Zavěsit ── */
        .acs-hangup-row {
          grid-column: 1 / -1; display: flex; justify-content: center;
          margin-top: 0.5rem;
        }
        .acs-hangup-btn {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 28px rgba(220,38,38,0.5);
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .acs-hangup-btn:active {
          transform: scale(0.92);
          box-shadow: 0 3px 14px rgba(220,38,38,0.4);
        }
      `}</style>

      <div className="acs-root" style={{ position: 'relative' }}>

        {/* ── Dialpad overlay ── */}
        {showDialpad && (
          <div className="acs-dialpad-overlay">
            <div className="acs-dialpad-input">{dialInput || '·'}</div>
            <div className="acs-dialpad-grid">
              {DIALPAD_KEYS.flat().map(k => (
                <button key={k} className="acs-dialbtn" onClick={() => dialpadPress(k)}>{k}</button>
              ))}
            </div>
            <button className="acs-dialpad-close" onClick={() => setShowDialpad(false)}>
              <ChevronDown size={22} />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className="acs-header">
          <span className="acs-sip-badge">🎙 SIP audio aktivní</span>
          <div className="acs-avatar-wrap">
            <PhoneOff size={36} color="white" style={{ display: 'none' }} />
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="acs-caller">{caller || 'Neznámé číslo'}</div>
          {profileName && <div className="acs-profile-tag">Profil: {profileName}</div>}
          <div className="acs-timer">{formatTime(seconds)}</div>
        </div>

        {/* ── Ovládací grid ── */}
        <div className="acs-controls">
          <div className="acs-grid">

            {/* Mute */}
            <button className="acs-ctrl-btn" onClick={toggleMute} aria-label="Ztlumit">
              <div className={`acs-ctrl-icon ${isMuted ? 'active-red' : ''}`}>
                {isMuted
                  ? <MicOff size={24} color="#ef4444" />
                  : <Mic size={24} color="rgba(200,210,240,0.9)" />
                }
              </div>
              <span className="acs-ctrl-label">{isMuted ? 'Ztlumeno' : 'Ztlumit'}</span>
            </button>

            {/* Reproduktor */}
            <button className="acs-ctrl-btn" onClick={toggleSpeaker} aria-label="Reproduktor">
              <div className={`acs-ctrl-icon ${isSpeaker ? 'active' : ''}`}>
                {isSpeaker
                  ? <Volume2 size={24} color="#3b82f6" />
                  : <VolumeX size={24} color="rgba(200,210,240,0.9)" />
                }
              </div>
              <span className="acs-ctrl-label">{isSpeaker ? 'Reproduktor' : 'Sluchátko'}</span>
            </button>

            {/* Klávesnice */}
            <button className="acs-ctrl-btn" onClick={() => setShowDialpad(true)} aria-label="Klávesnice">
              <div className="acs-ctrl-icon">
                <Hash size={24} color="rgba(200,210,240,0.9)" />
              </div>
              <span className="acs-ctrl-label">Klávesnice</span>
            </button>

            {/* Zavěsit */}
            <div className="acs-hangup-row">
              <button className="acs-hangup-btn" onClick={hangup} aria-label="Zavěsit">
                <PhoneOff size={28} color="white" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
