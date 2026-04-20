import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Phone, MapPin, Clock, Volume2, User, History } from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const SOSPanel = () => {
  const { t, lang, API_BASE, token, showToast, socket } = useNexus();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [subView, setSubView] = useState('active');
  const [loading, setLoading] = useState(false);
  const [fakeCallTarget, setFakeCallTarget] = useState('');

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sos/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      setActiveAlerts(await res.json());
    } catch {
      // silent
    }
  }, [API_BASE, token]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sos/history?page=${historyPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistory(data.alerts || []);
      setHistoryTotal(data.total || 0);
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se načíst historii' : 'Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, historyPage]);

  useEffect(() => { fetchActive(); }, [fetchActive]);
  useEffect(() => { if (subView === 'history') fetchHistory(); }, [subView, fetchHistory]);

  // Real-time SOS events
  useEffect(() => {
    if (!socket) return;
    const onSOS = (data) => {
      setActiveAlerts(prev => [{ ...data, id: data.alertId, status: 'active', createdAt: data.timestamp }, ...prev]);
      showToast(`🆘 SOS: ${data.userName}`, 'error');
      // Play alert sound
      try { new Audio('/alert.mp3').play().catch(() => {}); } catch {}
    };
    const onAck = (data) => {
      setActiveAlerts(prev => prev.map(a => a.id === data.alertId ? { ...a, status: 'acknowledged' } : a));
    };
    const onResolved = (data) => {
      setActiveAlerts(prev => prev.filter(a => a.id !== data.alertId));
    };
    const onLocation = (data) => {
      setActiveAlerts(prev => prev.map(a => a.id === data.alertId ? { ...a, lat: data.lat, lng: data.lng } : a));
    };

    socket.on('sos_triggered', onSOS);
    socket.on('sos_acknowledged', onAck);
    socket.on('sos_resolved', onResolved);
    socket.on('sos_location_update', onLocation);
    // Legacy event from SafetySession escalation
    socket.on('emergency_alert', () => fetchActive());
    return () => {
      socket.off('sos_triggered', onSOS);
      socket.off('sos_acknowledged', onAck);
      socket.off('sos_resolved', onResolved);
      socket.off('sos_location_update', onLocation);
      socket.off('emergency_alert');
    };
  }, [socket]);

  const handleAcknowledge = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/api/sos/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      setActiveAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' } : a));
      showToast(lang === 'cs' ? 'SOS přijato' : 'SOS acknowledged', 'success');
    } catch {
      showToast(lang === 'cs' ? 'Chyba' : 'Error', 'error');
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/api/sos/${alertId}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
      showToast(lang === 'cs' ? 'SOS vyřešeno' : 'SOS resolved', 'success');
    } catch {
      showToast(lang === 'cs' ? 'Chyba' : 'Error', 'error');
    }
  };

  const handleFakeCall = async (targetUserId) => {
    try {
      const res = await fetch(`${API_BASE}/api/sos/fake-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, delay: 5 })
      });
      if (!res.ok) throw new Error();
      showToast(lang === 'cs' ? 'Falešný hovor odeslán' : 'Fake call sent', 'success');
    } catch {
      showToast(lang === 'cs' ? 'Nepodařilo se odeslat' : 'Failed to send', 'error');
    }
  };

  const typeLabels = { manual: '🔴 Manual', voice: '🎙️ Voice', timer_expired: '⏰ Timer' };

  return (
    <div data-testid="page-sos-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { id: 'active', label: t('sosActive'), icon: AlertTriangle, count: activeAlerts.length },
          { id: 'history', label: t('sosHistory'), icon: History }
        ].map(tab => (
          <button key={tab.id} onClick={() => setSubView(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.85rem', borderRadius: '8px',
            background: subView === tab.id ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${subView === tab.id ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
            color: subView === tab.id ? '#ef4444' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
          }}>
            <tab.icon size={14} />
            {tab.label}
            {tab.count > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', padding: '0 6px', fontSize: '0.65rem', fontWeight: 900 }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active Alerts */}
      {subView === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={40} style={{ opacity: 0.3, marginBottom: '0.75rem', color: '#22c55e' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                {lang === 'cs' ? 'Žádné aktivní SOS alerty' : 'No active SOS alerts'}
              </div>
            </div>
          ) : activeAlerts.map(alert => (
            <div key={alert.id} style={{
              padding: '1.25rem', borderRadius: '14px',
              background: alert.status === 'active' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${alert.status === 'active' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              animation: alert.status === 'active' ? 'pulse-border 2s infinite' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={18} color={alert.status === 'active' ? '#ef4444' : '#f59e0b'} />
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: 'white' }}>
                      {alert.userName || (lang === 'cs' ? 'Neznámý' : 'Unknown')}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444'
                    }}>
                      {typeLabels[alert.type] || alert.type}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                      background: alert.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: alert.status === 'active' ? '#ef4444' : '#f59e0b'
                    }}>
                      {alert.status === 'active' ? (lang === 'cs' ? 'AKTIVNÍ' : 'ACTIVE') : (lang === 'cs' ? 'PŘIJATO' : 'ACKNOWLEDGED')}
                    </span>
                  </div>
                  {(alert.lat && alert.lng) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <MapPin size={14} />
                        <a href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>
                          {isCz ? 'Aktuální poloha' : 'Current Location'} ({alert.lat.toFixed(5)}, {alert.lng.toFixed(5)})
                        </a>
                      </div>
                      
                      {nexus.gpsHistory && nexus.gpsHistory.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                          <History size={14} />
                          <span style={{ fontWeight: 600 }}>{isCz ? 'Historie pohybu (Breadcrumbs)' : 'Movement Trail'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Breadcrumb Trail Visualization */}
                  {nexus.gpsHistory && nexus.gpsHistory.length > 1 && (
                    <div style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: '10px', 
                      marginBottom: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}>
                      {nexus.gpsHistory.slice(-5).reverse().map((pos, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: idx === 0 ? '#ef4444' : 'rgba(255,255,255,0.2)' }} />
                          <span style={{ color: idx === 0 ? 'white' : 'var(--text-secondary)', fontWeight: idx === 0 ? 800 : 500 }}>
                            {new Date(pos.timestamp).toLocaleTimeString()} → 
                            <a href={`https://maps.google.com/?q=${pos.lat},${pos.lng}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', marginLeft: '0.3rem', textDecoration: 'none' }}>
                               {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                            </a>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={12} />{new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {alert.status === 'active' && (
                    <button onClick={() => handleAcknowledge(alert.id)} style={{
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                      color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                    }}>
                      {t('acknowledgeSOS')}
                    </button>
                  )}
                  <button onClick={() => handleResolve(alert.id)} style={{
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    color: '#22c55e', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                  }}>
                    {t('resolveSOS')}
                  </button>
                  {alert.userId && (
                    <button onClick={() => handleFakeCall(alert.userId)} style={{
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                      color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.3rem'
                    }}>
                      <Phone size={14} />{t('fakeCall')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {subView === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinning" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {lang === 'cs' ? 'Žádná historie SOS' : 'No SOS history'}
            </div>
          ) : history.map(alert => (
            <div key={alert.id} style={{
              padding: '0.85rem', borderRadius: '10px',
              background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: alert.status === 'resolved' ? '#22c55e' : alert.status === 'acknowledged' ? '#f59e0b' : '#ef4444'
                }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                    {typeLabels[alert.type] || alert.type}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {new Date(alert.createdAt).toLocaleString()}
                    {alert.resolvedAt && ` → ${new Date(alert.resolvedAt).toLocaleTimeString()}`}
                  </div>
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                background: alert.status === 'resolved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: alert.status === 'resolved' ? '#22c55e' : '#ef4444'
              }}>
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};

export default SOSPanel;
