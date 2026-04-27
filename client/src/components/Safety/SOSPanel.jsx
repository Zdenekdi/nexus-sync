import React, { useState, useCallback, useEffect } from 'react';
import { ShieldAlert, History, Clock, MapPin, AlertTriangle, ChevronRight, Bell, BellOff } from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const SOSPanel = () => {
  const { t, lang, API_BASE, token, showToast, socket, gpsHistory: _gpsHistory } = useNexus();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage] = useState(1);
  const [subView, setSubView] = useState('active');
  const [loading, setLoading] = useState(false);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/safety/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data.alerts || []);
      }
    } catch { /* ignore */ }
  }, [API_BASE, token]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/safety/history?page=${historyPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistory(data.alerts || []);
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se načíst historii' : 'Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, historyPage, lang, showToast]);

  useEffect(() => { fetchActive(); }, [fetchActive]);
  useEffect(() => { if (subView === 'history') fetchHistory(); }, [subView, fetchHistory]);

  // Real-time SOS events
  useEffect(() => {
    if (!socket) return;
    socket.on('sos_alert', (alert) => {
      setActiveAlerts(prev => [alert, ...prev]);
      showToast(lang === 'cs' ? 'NOVÝ SOS POPLACH!' : 'NEW SOS ALERT!', 'error');
    });
    socket.on('sos_resolved', (alertId) => {
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    });
    return () => {
      socket.off('sos_alert');
      socket.off('sos_resolved');
    };
  }, [socket, lang, showToast]);

  const handleResolve = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/safety/resolve/${alertId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
        showToast(lang === 'cs' ? 'Poplach vyřešen' : 'Alert resolved', 'success');
      }
    } catch {
      showToast('Error resolving alert', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={28} color="#ef4444" /> {t('sosMonitoring')}
        </h2>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
          <button 
            onClick={() => setSubView('active')}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', 
              background: subView === 'active' ? 'var(--accent-color)' : 'transparent',
              color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {t('activeAlerts')} ({activeAlerts.length})
          </button>
          <button 
            onClick={() => setSubView('history')}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', 
              background: subView === 'history' ? 'var(--accent-color)' : 'transparent',
              color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {t('historyLabel')}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
        {subView === 'active' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--card-border)' }}>
                <BellOff size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1rem' }} />
                <div style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{t('noActiveAlerts')}</div>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444', animation: 'pulse 2s infinite' }}>
                  <style>{`@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>{alert.operatorName || 'Unknown Operator'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: '800', marginTop: '0.25rem' }}>
                        <AlertTriangle size={14} /> {t('sosTriggered')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '700' }}>{alert.time || new Date(alert.timestamp).toLocaleTimeString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(alert.timestamp).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{t('lastKnownLocation')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: '700' }}>
                        <MapPin size={16} color="var(--accent-color)" />
                        {alert.lat}, {alert.lng}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{t('deviceBattery')}</div>
                      <div style={{ color: (alert.battery || 100) < 20 ? '#ef4444' : '#22c55e', fontWeight: '900' }}>{alert.battery || 100}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      {t('markAsResolved')}
                    </button>
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps?q=${alert.lat},${alert.lng}`, '_blank')}
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      {t('openMaps')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>{t('loadingHistory')}</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>{t('noHistory')}</div>
            ) : (
              history.map(item => (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <History size={20} color="var(--text-secondary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'white' }}>{item.operatorName || 'Operator'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--success-color)', fontWeight: '800', textTransform: 'uppercase' }}>{t('resolved')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('by')}: {item.resolvedBy || 'System'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSPanel;
