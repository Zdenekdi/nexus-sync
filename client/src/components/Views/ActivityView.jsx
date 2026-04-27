import React, { useState, useEffect, useCallback } from 'react';
import { Shield, User, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

import { useNexus } from '../../context/ContextHook';

const ACTION_COLORS = {
  LOGIN: '#3b82f6',
  AGENCY_REGISTERED: '#10b981',
  ROLE_UPDATED: '#f59e0b',
  PROFILE_UPDATED: '#8b5cf6',
  BOOKING_CREATED: '#ec4899',
  DEFAULT: '#6b7280'
};

const ActivityView = () => {
  const nexus = useNexus();
  const { isMobile, t, lang, API_BASE, token } = nexus;
  const cz = lang === 'cz' || lang === 'cs';

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (filterAction) params.append('action', filterAction);
      const res = await axios.get(`${API_BASE}/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (_err) {
      console.error('Failed to load audit logs:', _err);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, token, page, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(cz ? 'cs-CZ' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
           d.toLocaleTimeString(cz ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const actionColor = (action) => ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;

  return (
    <div data-testid="page-activity-container" style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '800' }}>
            {t('auditTrail')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>
            {cz ? `${total} záznamů celkem` : `${total} total entries`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={filterAction}
              onChange={_err => { setFilterAction(_err.target.value); setPage(1); }}
              placeholder={cz ? 'Filtrovat akci...' : 'Filter action...'}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '8px', color: 'white', fontSize: '0.8rem', width: '180px' }}
            />
          </div>
          <button onClick={fetchLogs} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {isLoading && logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '1rem' }} />
          <div>{cz ? 'Načítání...' : 'Loading...'}</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem' }}>
          <Shield size={48} color="#374151" />
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>
            {cz ? 'Žádné záznamy' : 'No audit log entries'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#475569' }}>
            {cz ? 'Záznamy o aktivitě se zobrazí, jakmile dojde k prvním akcím' : 'Activity logs will appear once actions are recorded'}
          </div>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map(log => (
            <div key={log.id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{formatTime(log.timestamp)}</span>
                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', background: `${actionColor(log.action)}20`, color: actionColor(log.action) }}>{log.action}</span>
              </div>
              {log.details && <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{log.details}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <User size={12} /> {log.userName}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                {[cz ? 'Čas' : 'Time', cz ? 'Akce' : 'Action', cz ? 'Uživatel' : 'User', cz ? 'Detail' : 'Details'].map(h =>
                  <th key={h} style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.05em' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatTime(log.timestamp)}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px', fontWeight: '800', background: `${actionColor(log.action)}15`, color: actionColor(log.action) }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>
                      <User size={14} /> {log.userName}
                    </div>
                    {log.userEmail && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{log.userEmail}</div>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '8px', color: page === 1 ? 'var(--text-secondary)' : 'white', cursor: page === 1 ? 'default' : 'pointer', display: 'flex' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '8px', color: page === pages ? 'var(--text-secondary)' : 'white', cursor: page === pages ? 'default' : 'pointer', display: 'flex' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityView;
