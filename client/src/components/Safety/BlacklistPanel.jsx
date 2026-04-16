import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Search, X, Shield, Car, Phone, User, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useNexus } from '../../context/NexusBaseContext';

const BlacklistPanel = () => {
  const { t, lang, API_BASE, token, showToast, socket } = useNexus();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({ phone: '', licensePlate: '', name: '', description: '', severity: 'warning' });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/blacklist?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se načíst černou listinu' : 'Failed to load blacklist', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, page, search]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Real-time blacklist updates
  useEffect(() => {
    if (!socket) return;
    const onNew = () => fetchEntries();
    socket.on('blacklist_new', onNew);
    return () => socket.off('blacklist_new', onNew);
  }, [socket, fetchEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description) {
      showToast(lang === 'cs' ? 'Popis je povinný' : 'Description is required', 'error');
      return;
    }
    if (!form.phone && !form.licensePlate && !form.name) {
      showToast(lang === 'cs' ? 'Vyplňte alespoň telefon, SPZ nebo jméno' : 'Fill at least phone, license plate, or name', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error();
      showToast(lang === 'cs' ? 'Záznam přidán' : 'Entry added', 'success');
      setForm({ phone: '', licensePlate: '', name: '', description: '', severity: 'warning' });
      setShowForm(false);
      fetchEntries();
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se přidat záznam' : 'Failed to add entry', 'error');
    }
  };

  const handleReport = async (entryId) => {
    try {
      const res = await fetch(`${API_BASE}/blacklist/${entryId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: '' })
      });
      if (!res.ok) throw new Error();
      showToast(lang === 'cs' ? 'Hlášení potvrzeno' : 'Report confirmed', 'success');
      fetchEntries();
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se potvrdit' : 'Failed to confirm', 'error');
    }
  };

  const handleDelete = async (entryId) => {
    try {
      const res = await fetch(`${API_BASE}/blacklist/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      showToast(lang === 'cs' ? 'Záznam smazán' : 'Entry deleted', 'success');
      fetchEntries();
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se smazat' : 'Failed to delete', 'error');
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.85rem',
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: 'white', fontSize: '0.85rem', outline: 'none'
  };

  return (
    <div data-testid="page-blacklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={lang === 'cs' ? 'Hledat telefon, SPZ, jméno...' : 'Search phone, plate, name...'}
            style={{ ...inputStyle, paddingLeft: '2.2rem' }}
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.6rem 1rem', borderRadius: '8px',
            background: showForm ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${showForm ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`,
            color: showForm ? '#ef4444' : '#3b82f6',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? (lang === 'cs' ? 'Zrušit' : 'Cancel') : t('addEntry')}
        </button>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {total} {lang === 'cs' ? 'záznamů' : 'entries'}
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card" style={{
          padding: '1.25rem', borderRadius: '14px',
          background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />{t('phone')}
              </label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+420..." style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                <Car size={12} style={{ display: 'inline', marginRight: '4px' }} />{t('licensePlate')}
              </label>
              <input value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })} placeholder="1A2 3456" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
                <User size={12} style={{ display: 'inline', marginRight: '4px' }} />{lang === 'cs' ? 'Jméno' : 'Name'}
              </label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>{t('severity')}</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="warning">{t('warning')}</option>
                <option value="danger">{t('danger')}</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>
              <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px' }} />{t('description')} *
            </label>
            <textarea
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3} required
              placeholder={lang === 'cs' ? 'Popište incident...' : 'Describe the incident...'}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <button type="submit" style={{
            marginTop: '0.75rem', padding: '0.6rem 1.5rem', borderRadius: '8px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none',
            color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
          }}>
            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            {t('addEntry')}
          </button>
        </form>
      )}

      {/* Entries List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <div className="spinning" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto' }} />
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Shield size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            {lang === 'cs' ? 'Žádné záznamy v černé listině' : 'No blacklist entries'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {entries.map(entry => (
            <div key={entry.id} className="glass-card" style={{
              padding: '1rem', borderRadius: '12px',
              background: 'rgba(15,23,42,0.4)',
              borderLeft: `3px solid ${entry.severity === 'danger' ? '#ef4444' : '#f59e0b'}`,
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                      background: entry.severity === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: entry.severity === 'danger' ? '#ef4444' : '#f59e0b'
                    }}>
                      {entry.severity === 'danger' ? '⚠️ ' : '⚡ '}{entry.severity === 'danger' ? t('danger') : t('warning')}
                    </span>
                    {entry.phone && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} />{entry.phone}
                      </span>
                    )}
                    {entry.licensePlate && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        <Car size={12} />{entry.licensePlate}
                      </span>
                    )}
                    {entry.name && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />{entry.name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    {entry.description}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>{t('reportedBy')}: {entry.createdByName}</span>
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    {entry.reports?.length > 0 && (
                      <span style={{ color: '#3b82f6' }}>
                        <CheckCircle2 size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                        {entry.reports.length + 1}x {t('confirmations')}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleReport(entry.id)}
                    style={{
                      padding: '0.4rem 0.75rem', borderRadius: '6px',
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {t('confirmReport')}
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    style={{
                      padding: '0.4rem 0.5rem', borderRadius: '6px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > 30 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.3 : 1 }}>←</button>
              <span style={{ padding: '0.4rem 0.8rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{page}</span>
              <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: page * 30 < total ? 'pointer' : 'not-allowed', opacity: page * 30 >= total ? 0.3 : 1 }}>→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlacklistPanel;
