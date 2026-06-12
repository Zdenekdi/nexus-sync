import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNexus } from '../../context/ContextHook';

// ─── Inline SVG Icons (no lucide dependency issues) ────────────────────────
const KeyIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
);

const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const ClockIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const PlusIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const HistoryIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5"/>
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
  </svg>
);

const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDuration(since) {
  if (!since) return '';
  const diff = Date.now() - new Date(since).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}min`;
  return `${mins} min`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }) {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
  const color = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
      border: `2px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, color: '#fff',
      flexShrink: 0,
      boxShadow: `0 0 12px ${color}44`,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Key Card ────────────────────────────────────────────────────────────────
function KeyCard({ keyData, currentUserId, isManager, onTake, onReturn, onDelete, onHistory }) {
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const isTaken = !!keyData.holderId;
  const isMyKey = keyData.holderId === currentUserId;
  const canReturn = isMyKey || isManager;

  const handleTake = async () => {
    setLoading(true);
    await onTake(keyData.id, noteInput || undefined);
    setLoading(false);
    setShowNoteInput(false);
    setNoteInput('');
  };

  const handleReturn = async () => {
    setLoading(true);
    await onReturn(keyData.id);
    setLoading(false);
  };

  const statusColor = isTaken ? '#ef4444' : '#10b981';
  const statusGlow = isTaken ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTaken ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)'}`,
      borderRadius: 20,
      padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      transition: 'all 0.3s ease',
      boxShadow: isTaken ? '0 4px 20px rgba(239,68,68,0.08)' : '0 4px 20px rgba(16,185,129,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${statusColor}88, transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isTaken ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
            border: `1px solid ${isTaken ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: statusColor,
            boxShadow: `0 0 16px ${statusGlow}`,
          }}>
            <KeyIcon size={20} color={statusColor} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{keyData.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
                animation: isTaken ? 'none' : 'pulse-green 2s infinite',
              }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor }}>
                {isTaken ? 'MIMO SALON' : 'V SALONU'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onHistory(keyData.id, keyData.label)}
            title="Historie předání"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.color = 'var(--accent-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <HistoryIcon size={14} />
          </button>
          {isManager && (
            <button
              onClick={() => onDelete(keyData.id, keyData.label)}
              title="Smazat klíče"
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)',
                background: 'rgba(239,68,68,0.05)', color: 'rgba(239,68,68,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; }}
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Holder info */}
      {isTaken && keyData.holder && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', borderRadius: 12,
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
        }}>
          <Avatar name={keyData.holder.name} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {keyData.holder.name}
              {isMyKey && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: 700 }}>(ty)</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>
              <ClockIcon size={12} />
              <span>od {formatTime(keyData.takenAt)} · {formatDuration(keyData.takenAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Note */}
      {isTaken && keyData.note && (
        <div style={{
          padding: '0.6rem 0.9rem', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic',
        }}>
          „{keyData.note}"
        </div>
      )}

      {/* Actions */}
      {!isTaken && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {showNoteInput && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                autoFocus
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTake()}
                placeholder="Poznámka (volitelné)..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(59,130,246,0.3)', color: '#fff',
                  padding: '0.6rem 0.9rem', borderRadius: 10, fontSize: '0.85rem',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button onClick={() => setShowNoteInput(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem' }}>
                <XIcon size={16} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleTake}
              disabled={loading}
              style={{
                flex: 1, padding: '0.65rem 1rem',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10b981', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(16,185,129,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
            >
              {loading ? '...' : '🗝 Převzít klíče'}
            </button>
            {!showNoteInput && (
              <button
                onClick={() => setShowNoteInput(true)}
                title="Přidat poznámku"
                style={{
                  padding: '0.65rem 0.9rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)', borderRadius: 10, cursor: 'pointer',
                  fontSize: '0.85rem', transition: 'all 0.2s',
                }}
              >
                📝
              </button>
            )}
          </div>
        </div>
      )}

      {isTaken && canReturn && (
        <button
          onClick={handleReturn}
          disabled={loading}
          style={{
            width: '100%', padding: '0.65rem 1rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        >
          {loading ? '...' : '↩ Vrátit klíče'}
        </button>
      )}

      {isTaken && !canReturn && (
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>
          Pouze {keyData.holder?.name || 'držitel'} nebo manažer může vrátit klíče
        </div>
      )}
    </div>
  );
}

// ─── History Modal ────────────────────────────────────────────────────────────
function HistoryModal({ keyId, keyLabel, token, API_BASE, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!keyId) return;
    axios.get(`${API_BASE}/salon-keys/${keyId}/history`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setLogs(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setLoading(false));
  }, [keyId, token, API_BASE]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, width: '100%', maxWidth: 480,
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <HistoryIcon size={18} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Historie předání</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>{keyLabel}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
            <XIcon size={20} />
          </button>
        </div>

        {/* Log list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Načítám...</div>
          )}
          {!loading && logs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '0.9rem' }}>
              Žádná historie předání
            </div>
          )}
          {logs.map((log, i) => (
            <div key={log.id} style={{
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              padding: '0.75rem 0',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              {/* Timeline dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: log.action === 'TAKEN' ? '#ef4444' : '#10b981',
                  boxShadow: `0 0 8px ${log.action === 'TAKEN' ? '#ef4444' : '#10b981'}66`,
                  flexShrink: 0,
                }} />
                {i < logs.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', minHeight: 20, marginTop: 4 }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em',
                    color: log.action === 'TAKEN' ? '#ef4444' : '#10b981',
                    background: log.action === 'TAKEN' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    padding: '2px 7px', borderRadius: 5,
                  }}>
                    {log.action === 'TAKEN' ? '↑ VZATO' : '↓ VRÁCENO'}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user?.name}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                  {formatTime(log.createdAt)}
                </div>
                {log.note && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4 }}>
                    „{log.note}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Add Key Modal ────────────────────────────────────────────────────────────
function AddKeyModal({ token, API_BASE, onClose, onAdded }) {
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!label.trim()) { setError('Zadej název klíčů'); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/salon-keys`, { label: label.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onAdded(r.data);
      onClose();
    } catch (_err) {
      setError(_err?.response?.data?.error || 'Chyba při vytváření');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, width: '100%', maxWidth: 400, padding: '1.5rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Přidat klíče</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><XIcon size={18} /></button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Název / lokace
          </label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder='např. "Klíče – Praha 1", "Klíče – zadní vchod"'
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.3)',
              color: '#fff', padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.9rem',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 6 }}>{error}</div>}
        </div>

        <button
          onClick={handleAdd}
          disabled={loading}
          style={{
            width: '100%', padding: '0.75rem', background: 'var(--accent-color)',
            border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700,
            fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
          }}
        >
          {loading ? 'Vytváří se...' : 'Přidat'}
        </button>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function SalonKeysView() {
  const { token, API_BASE, activeOperator } = useNexus();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyModal, setHistoryModal] = useState(null); // { id, label }
  const [showAddModal, setShowAddModal] = useState(false);

  const isManager = !!(activeOperator?.isManager || activeOperator?.isAdmin || activeOperator?.isAppOwner);
  const currentUserId = activeOperator?.id;

  const loadKeys = useCallback(async () => {
    if (!token || !API_BASE) return;
    try {
      const r = await axios.get(`${API_BASE}/salon-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(Array.isArray(r.data) ? r.data : []);
      setError('');
    } catch (_err) {
      setError('Nepodařilo se načíst klíče');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE]);

  useEffect(() => {
    loadKeys();
    // Refresh every 30s
    const interval = setInterval(loadKeys, 30000);
    return () => clearInterval(interval);
  }, [loadKeys]);

  const handleTake = async (id, note) => {
    try {
      const r = await axios.post(`${API_BASE}/salon-keys/${id}/take`, { note }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(prev => prev.map(k => k.id === id ? r.data : k));
    } catch (_err) {
      alert(_err?.response?.data?.error || 'Chyba při převzetí');
    }
  };

  const handleReturn = async (id) => {
    try {
      const r = await axios.post(`${API_BASE}/salon-keys/${id}/return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(prev => prev.map(k => k.id === id ? r.data : k));
    } catch (_err) {
      alert(_err?.response?.data?.error || 'Chyba při vrácení');
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Smazat "${label}"? Tato akce je nevratná.`)) return;
    try {
      await axios.delete(`${API_BASE}/salon-keys/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch (_err) {
      alert('Chyba při mazání');
    }
  };

  const takenCount = keys.filter(k => k.holderId).length;
  const freeCount = keys.filter(k => !k.holderId).length;

  return (
    <div className="scrollable-view" style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
              🗝 Klíče od salonu
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Přehled, kdo aktuálně drží klíče a od kdy
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Stats pills */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {takenCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  fontSize: '0.78rem', fontWeight: 700, color: '#ef4444',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                  {takenCount} mimo salon
                </div>
              )}
              {freeCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: '0.78rem', fontWeight: 700, color: '#10b981',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse-green 2s infinite' }} />
                  {freeCount} v salonu
                </div>
              )}
            </div>

            {isManager && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 10, color: 'var(--accent-color)', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
              >
                <PlusIcon size={16} />
                Přidat klíče
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 20 }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          padding: '1.5rem', borderRadius: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', textAlign: 'center',
        }}>
          {error}
          <button onClick={loadKeys} style={{ marginLeft: 12, color: 'var(--accent-color)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Zkusit znovu
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && keys.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.02)', borderRadius: 20,
          border: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗝</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Žádné klíče nenalezeny</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {isManager ? 'Přidej první sadu klíčů pro sledování.' : 'Manažer ještě nepřidal žádné klíče.'}
          </div>
          {isManager && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '0.7rem 1.5rem', background: 'var(--accent-color)', border: 'none',
                borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}
            >
              + Přidat klíče
            </button>
          )}
        </div>
      )}

      {/* Key cards grid */}
      {!loading && keys.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {keys.map(keyData => (
            <KeyCard
              key={keyData.id}
              keyData={keyData}
              currentUserId={currentUserId}
              isManager={isManager}
              onTake={handleTake}
              onReturn={handleReturn}
              onDelete={handleDelete}
              onHistory={(id, label) => setHistoryModal({ id, label })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {historyModal && (
        <HistoryModal
          keyId={historyModal.id}
          keyLabel={historyModal.label}
          token={token}
          API_BASE={API_BASE}
          onClose={() => setHistoryModal(null)}
        />
      )}
      {showAddModal && (
        <AddKeyModal
          token={token}
          API_BASE={API_BASE}
          onClose={() => setShowAddModal(false)}
          onAdded={newKey => setKeys(prev => [...prev, newKey])}
        />
      )}
    </div>
  );
}
