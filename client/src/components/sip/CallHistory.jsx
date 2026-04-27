import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Phone, RefreshCw, Clock, ChevronRight
} from 'lucide-react';
import { NexusSip } from '../../plugins/NexusSip';

/**
 * CallHistory.jsx
 * Seznam SIP hovorů stažený z NexusSipPlugin.getCallHistory().
 *
 * Props:
 *   onCallBack  {function(caller: string)}  — callback pro zavolání zpět
 *   style       {object}                    — volitelné inline styly pro root
 */
export default function CallHistory({ onCallBack, style }) {
  const [calls,    setCalls]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  // ── Načtení z pluginu ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { calls: data } = await NexusSip.getCallHistory();
      setCalls(Array.isArray(data) ? data : []);
    } catch (_err) {
      console.warn('[SIP] getCallHistory _err', _err);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Zavolat zpět ──────────────────────────────────────────────────────────
  const callBack = (caller) => {
    setSelected(null);
    onCallBack?.(caller);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const directionMeta = (dir, status) => {
    if (status === 'missed') return {
      Icon: PhoneMissed, color: '#ef4444', label: 'Zmeškaný',
    };
    if (dir === 'outbound') return {
      Icon: PhoneOutgoing, color: '#3b82f6', label: 'Odchozí',
    };
    return {
      Icon: PhoneIncoming, color: '#22c55e', label: 'Příchozí',
    };
  };

  const formatDuration = (sec) => {
    if (!sec || sec < 1) return null;
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffH  = diffMs / 3_600_000;
    if (diffH < 1)    return 'před chvílí';
    if (diffH < 24)   return `před ${Math.floor(diffH)} hod`;
    if (diffH < 48)   return 'včera';
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .ch-root {
          display: flex; flex-direction: column;
          background: transparent;
          font-family: 'Inter', sans-serif;
          width: 100%;
        }

        /* ── Header ── */
        .ch-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 0 1rem 0;
        }
        .ch-title {
          font-size: 1rem; font-weight: 800; color: #e2e8ff;
          letter-spacing: -0.01em;
        }
        .ch-refresh {
          background: none; border: none; cursor: pointer;
          color: rgba(160,175,210,0.55); padding: 0.4rem;
          display: flex; align-items: center;
          border-radius: 8px; transition: color 0.15s, background 0.15s;
        }
        .ch-refresh:hover { color: #3b82f6; background: rgba(59,130,246,0.1); }

        /* ── Empty ── */
        .ch-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.65rem; padding: 3rem 0; opacity: 0.45;
        }
        .ch-empty-label {
          font-size: 0.85rem; color: rgba(160,175,210,0.7);
        }

        /* ── Skeleton ── */
        .ch-skeleton-item {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.9rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          animation: chSkelPulse 1.5s ease-in-out infinite;
        }
        .ch-skel-circle {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.07); flex-shrink: 0;
        }
        .ch-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }
        .ch-skel-line {
          height: 11px; border-radius: 6px;
          background: rgba(255,255,255,0.07);
        }
        @keyframes chSkelPulse {
          0%, 100% { opacity: 0.6; } 50% { opacity: 1; }
        }

        /* ── List ── */
        .ch-list { display: flex; flex-direction: column; }

        .ch-item {
          display: flex; align-items: center; gap: 0.9rem;
          padding: 0.85rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          cursor: pointer; transition: background 0.12s;
          border-radius: 8px; margin: 0 -0.5rem; padding: 0.85rem 0.5rem;
        }
        .ch-item:last-child { border-bottom: none; }
        .ch-item:active { background: rgba(255,255,255,0.04); }

        .ch-icon-wrap {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ch-info { flex: 1; min-width: 0; }
        .ch-caller {
          font-size: 0.93rem; font-weight: 700; color: #e2e8ff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 0.2rem;
        }
        .ch-meta {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.72rem; color: rgba(150,165,200,0.65);
        }
        .ch-dir-label { font-weight: 600; }
        .ch-dot { opacity: 0.4; }

        .ch-right {
          display: flex; flex-direction: column; align-items: flex-end;
          gap: 0.25rem; flex-shrink: 0;
        }
        .ch-date {
          font-size: 0.7rem; color: rgba(150,165,200,0.55);
          white-space: nowrap;
        }
        .ch-dur {
          display: flex; align-items: center; gap: 0.25rem;
          font-size: 0.7rem; color: rgba(150,165,200,0.45);
        }
        .ch-chevron { opacity: 0.3; }

        /* ── Action sheet ── */
        .ch-sheet-bg {
          position: fixed; inset: 0; z-index: 9980;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          animation: chFade 0.2s ease-out;
        }
        @keyframes chFade { from { opacity: 0; } }
        .ch-sheet {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: #0f1628; border-radius: 20px 20px 0 0;
          padding: 1.5rem 1.5rem max(env(safe-area-inset-bottom), 2rem) 1.5rem;
          animation: chSlideUp 0.25s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes chSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .ch-sheet-handle {
          width: 40px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.15); margin: 0 auto 1.5rem;
        }
        .ch-sheet-caller {
          font-size: 1.2rem; font-weight: 800; color: #e2e8ff;
          margin-bottom: 0.35rem;
        }
        .ch-sheet-sub {
          font-size: 0.78rem; color: rgba(150,165,200,0.6);
          margin-bottom: 1.5rem;
        }
        .ch-sheet-actions { display: flex; flex-direction: column; gap: 0.7rem; }
        .ch-sheet-btn {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 1rem 1.1rem; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.04);
          cursor: pointer; transition: background 0.12s;
          font-size: 0.9rem; font-weight: 600; color: #e2e8ff;
          text-align: left; width: 100%;
        }
        .ch-sheet-btn:active { background: rgba(255,255,255,0.1); }
        .ch-sheet-btn.primary {
          background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.35);
          color: #60a5fa;
        }
        .ch-sheet-btn.primary:active { background: rgba(37,99,235,0.25); }
        .ch-sheet-btn.cancel {
          background: rgba(255,255,255,0.03); color: rgba(150,165,200,0.65);
        }
        .ch-sheet-btn-icon {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
      `}</style>

      <div className="ch-root" style={style}>
        {/* Header */}
        <div className="ch-header">
          <span className="ch-title">Historie hovorů</span>
          <button className="ch-refresh" onClick={load} aria-label="Obnovit">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Skeleton */}
        {loading && [0,1,2].map(i => (
          <div className="ch-skeleton-item" key={i}>
            <div className="ch-skel-circle" />
            <div className="ch-skel-lines">
              <div className="ch-skel-line" style={{ width: '55%' }} />
              <div className="ch-skel-line" style={{ width: '35%' }} />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && calls.length === 0 && (
          <div className="ch-empty">
            <Phone size={32} color="rgba(160,175,210,0.3)" />
            <span className="ch-empty-label">Žádné hovory v historii</span>
          </div>
        )}

        {/* List */}
        {!loading && calls.length > 0 && (
          <div className="ch-list">
            {calls.map((call, i) => {
              const { Icon, color, label } = directionMeta(call.direction, call.status);
              const dur = formatDuration(call.duration);
              return (
                <div
                  key={i}
                  className="ch-item"
                  onClick={() => setSelected(call)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={_err => _err.key === 'Enter' && setSelected(call)}
                >
                  {/* Ikona směru */}
                  <div className="ch-icon-wrap"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon size={18} color={color} />
                  </div>

                  {/* Info */}
                  <div className="ch-info">
                    <div className="ch-caller">{call.caller || 'Neznámé číslo'}</div>
                    <div className="ch-meta">
                      <span className="ch-dir-label" style={{ color }}>{label}</span>
                      {dur && <><span className="ch-dot">·</span>
                        <Clock size={11} />{dur}</>}
                    </div>
                  </div>

                  {/* Datum */}
                  <div className="ch-right">
                    <span className="ch-date">{formatDate(call.startedAt)}</span>
                    <ChevronRight size={14} className="ch-chevron" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action sheet */}
        {selected && (
          <div className="ch-sheet-bg" onClick={() => setSelected(null)}>
            <div className="ch-sheet" onClick={_err => _err.stopPropagation()}>
              <div className="ch-sheet-handle" />
              <div className="ch-sheet-caller">{selected.caller || 'Neznámé číslo'}</div>
              <div className="ch-sheet-sub">
                {directionMeta(selected.direction, selected.status).label}
                {selected.startedAt && ` · ${formatDate(selected.startedAt)}`}
                {formatDuration(selected.duration) && ` · ${formatDuration(selected.duration)}`}
              </div>
              <div className="ch-sheet-actions">
                <button
                  className="ch-sheet-btn primary"
                  onClick={() => callBack(selected.caller)}
                >
                  <div className="ch-sheet-btn-icon">
                    <Phone size={18} color="#60a5fa" />
                  </div>
                  Zavolat zpět
                </button>
                <button className="ch-sheet-btn cancel" onClick={() => setSelected(null)}>
                  Zavřít
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
