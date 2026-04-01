import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { NexusSip } from '../../plugins/NexusSip';

/**
 * IncomingCallScreen.jsx
 * Zobrazí se při příchozím SIP hovoru (event incomingCall z NexusSipPlugin).
 * Pulzující animace, accept/decline tlačítka.
 *
 * Props:
 *   caller      {string}   — číslo nebo jméno volajícího
 *   profileName {string}   — název profilu (na který číslo přišel hovor)
 *   onAnswer    {function} — zavolá se po přijetí
 *   onReject    {function} — zavolá se po odmítnutí
 */
export default function IncomingCallScreen({ caller, profileName, onAnswer, onReject }) {
  const rejectRef = useRef(false);

  // Přehrání systémového zvonění (local notification vibrate) při zobrazení
  useEffect(() => {
    return () => { rejectRef.current = true; };
  }, []);

  const handleAnswer = async () => {
    if (rejectRef.current) return;
    try { await NexusSip.answer(); } catch (e) { console.warn('[SIP] answer err', e); }
    onAnswer?.();
  };

  const handleReject = async () => {
    if (rejectRef.current) return;
    rejectRef.current = true;
    try { await NexusSip.reject(); } catch (e) { console.warn('[SIP] reject err', e); }
    onReject?.();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

        .ics-root {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: linear-gradient(160deg, #0a0e1a 0%, #0d1526 50%, #080c17 100%);
          font-family: 'Inter', sans-serif;
          animation: icsFadeIn 0.35s ease-out;
          padding: env(safe-area-inset-top) env(safe-area-inset-right)
                   env(safe-area-inset-bottom) env(safe-area-inset-left);
          padding-top: max(env(safe-area-inset-top), 2rem);
        }
        @keyframes icsFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Pulzy ── */
        .ics-pulse-wrapper {
          position: relative; width: 160px; height: 160px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 2.5rem;
        }
        .ics-pulse-ring {
          position: absolute; border-radius: 50%;
          border: 2px solid rgba(59, 130, 246, 0.45);
          animation: icsPulse 2.2s ease-out infinite;
        }
        .ics-pulse-ring:nth-child(1) { width: 160px; height: 160px; animation-delay: 0s; }
        .ics-pulse-ring:nth-child(2) { width: 200px; height: 200px; animation-delay: 0.55s; }
        .ics-pulse-ring:nth-child(3) { width: 240px; height: 240px; animation-delay: 1.1s; }
        @keyframes icsPulse {
          0%   { opacity: 0.9; transform: scale(0.82); }
          70%  { opacity: 0;   transform: scale(1.15); }
          100% { opacity: 0;   transform: scale(1.15); }
        }

        .ics-avatar {
          width: 110px; height: 110px; border-radius: 50%;
          background: linear-gradient(135deg, #1e3a6e 0%, #2563eb 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.25), 0 8px 40px rgba(37,99,235,0.35);
          z-index: 1;
        }
        .ics-avatar svg { opacity: 0.95; }

        /* ── Text ── */
        .ics-label {
          font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em;
          color: #3b82f6; text-transform: uppercase; margin-bottom: 0.6rem;
        }
        .ics-caller {
          font-size: 2rem; font-weight: 800; color: #f1f5ff;
          text-align: center; margin-bottom: 0.35rem;
          letter-spacing: -0.02em;
        }
        .ics-profile {
          font-size: 0.85rem; color: rgba(180,190,220,0.7);
          margin-bottom: 5rem;
        }
        .ics-profile strong { color: rgba(180,190,220,0.95); }

        /* ── Tlačítka ── */
        .ics-actions {
          display: flex; gap: 3rem; align-items: center;
        }
        .ics-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.65rem;
          background: none; border: none; cursor: pointer; padding: 0;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .ics-btn:active { transform: scale(0.92); filter: brightness(0.85); }

        .ics-btn-circle {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          transition: box-shadow 0.2s;
        }
        .ics-btn-circle.decline {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          box-shadow: 0 4px 24px rgba(220,38,38,0.45);
        }
        .ics-btn-circle.accept {
          background: linear-gradient(135deg, #16a34a, #15803d);
          box-shadow: 0 4px 24px rgba(22,163,74,0.45);
        }
        .ics-btn-label {
          font-size: 0.75rem; font-weight: 600;
          color: rgba(180,190,220,0.75); letter-spacing: 0.04em;
        }

        /* ── Subtitle swipe hint ── */
        .ics-hint {
          position: absolute; bottom: max(env(safe-area-inset-bottom), 2rem);
          font-size: 0.7rem; color: rgba(180,190,220,0.3);
          letter-spacing: 0.08em;
        }
      `}</style>

      <div className="ics-root">
        {/* Pulzující avatar */}
        <div className="ics-pulse-wrapper">
          <div className="ics-pulse-ring" />
          <div className="ics-pulse-ring" />
          <div className="ics-pulse-ring" />
          <div className="ics-avatar">
            <Phone size={44} color="white" />
          </div>
        </div>

        {/* Informace */}
        <div className="ics-label">Příchozí hovor · SIP</div>
        <div className="ics-caller">{caller || 'Neznámé číslo'}</div>
        {profileName && (
          <div className="ics-profile">
            Profil: <strong>{profileName}</strong>
          </div>
        )}

        {/* Tlačítka */}
        <div className="ics-actions">
          <button className="ics-btn" onClick={handleReject} aria-label="Odmítnout">
            <div className="ics-btn-circle decline">
              <PhoneOff size={30} color="white" />
            </div>
            <span className="ics-btn-label">Odmítnout</span>
          </button>

          <button className="ics-btn" onClick={handleAnswer} aria-label="Přijmout">
            <div className="ics-btn-circle accept">
              <Phone size={30} color="white" />
            </div>
            <span className="ics-btn-label">Přijmout</span>
          </button>
        </div>

        <div className="ics-hint">SIP AUDIO · NEXUS RELAY</div>
      </div>
    </>
  );
}
