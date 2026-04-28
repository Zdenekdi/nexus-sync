import React, { useState, useEffect, useCallback } from 'react';
import { Shield, MapPin, Activity, Battery, Clock, AlertTriangle, CheckCircle2, User, Phone, Zap, Search, Filter, RefreshCw, Eye } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';
import axios from 'axios';

const SafetyGuardView = () => {
  const nexus = useNexus() || {};
  const { 
    t = (k) => k, 
    lang = 'en', 
    API_BASE = '', 
    token = '', 
    showToast = () => {}, 
    isMobile = false 
  } = nexus;

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isCz = lang === 'cz' || lang === 'cs';

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (!token || !API_BASE) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await axios.get(`${API_BASE}/api/safety/sessions/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data || []);
    } catch (_err) {
      console.error('Failed to fetch safety sessions:', _err);
      // Only show error if it's not a 404/empty state
      if (_err.response?.status !== 404) {
        showToast(isCz ? 'Nepodařilo se načíst data' : 'Failed to load safety data', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_BASE, token, isCz, showToast]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => fetchSessions(true), 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.profile?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || s.state.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (state) => {
    switch (state) {
      case 'ESCALATED': return '#ef4444';
      case 'GRACE': return '#f59e0b';
      case 'CHECKED_IN': return '#10b981';
      default: return '#64748b';
    }
  };

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.state === 'CHECKED_IN').length,
    warning: sessions.filter(s => s.state === 'GRACE').length,
    sos: sessions.filter(s => s.state === 'ESCALATED').length,
  };

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.03), transparent)' }}>
      {/* Header & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ background: '#3b82f6', padding: '6px', borderRadius: '8px' }}>
              <Shield size={20} color="white" />
            </div>
            <h2 style={{ margin: 0, fontWeight: 950, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em' }}>
              SAFETY <span style={{ color: '#3b82f6' }}>GUARD</span>
            </h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Activity size={12} color="#10b981" /> {t('realTimeMonitoringActive')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: isCz ? 'Vše' : 'Total', value: stats.total, color: 'white' },
            { label: isCz ? 'Aktivní' : 'Active', value: stats.active, color: '#10b981' },
            { label: isCz ? 'V limitu' : 'Grace', value: stats.warning, color: '#f59e0b' },
            { label: 'SOS', value: stats.sos, color: '#ef4444' }
          ].map(stat => (
            <div key={stat.label} style={{ 
              padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '80px'
            }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{stat.label}</span>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: stat.color }}>{stat.value}</span>
            </div>
          ))}
          <button onClick={() => fetchSessions(true)} style={{ 
            width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white'
          }}>
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
          <input 
            type="text" 
            placeholder={isCz ? "Hledat modelku..." : "Search model..."}
            value={search}
            onChange={(_err) => setSearch(_err.target.value)}
            style={{ 
              width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', borderRadius: '14px', 
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
              color: 'white', fontWeight: 600, outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          {['all', 'CHECKED_IN', 'GRACE', 'ESCALATED'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{ 
                padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                background: filter === f ? 'var(--accent-color)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                border: 'none', transition: 'all 0.2s'
              }}
            >
              {f === 'all' ? (isCz ? 'VŠE' : 'ALL') : (f === 'CHECKED_IN' ? (isCz ? 'AKTIVNÍ' : 'CHECKED IN') : f.replace('_', ' '))}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* Sessions Grid */}
        <div style={{ overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
          {loading ? (
             <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
             </div>
          ) : filteredSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--card-border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{isCz ? 'Žádné aktivní relace' : 'No active sessions found'}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {filteredSessions.map(session => (
                <div key={session.id} style={{ 
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${getStatusColor(session.state)}40`, borderRadius: '20px', padding: '1.25rem',
                  display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s ease',
                  boxShadow: session.state === 'ESCALATED' ? '0 0 20px rgba(239, 68, 68, 0.1)' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {session.profile?.image ? <img src={session.profile.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-secondary)" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 850, fontSize: '1rem', color: 'white' }}>{session.profile?.name}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: getStatusColor(session.state), textTransform: 'uppercase' }}>{session.state}</div>
                      </div>
                    </div>
                    <div style={{ padding: '4px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                       {session.locationType === 'incall' ? (isCz ? '🏠 NA ADRESE' : '🏠 INCALL') : (isCz ? '🚗 VÝJEZD' : '🚗 OUTCALL')}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Activity size={14} color="#ef4444" />
                       <div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tep</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>78 BPM</div>
                       </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Battery size={14} color="#10b981" />
                       <div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Baterie</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>92%</div>
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <MapPin size={12} />
                    {session.locationPoints?.[0] ? `${session.locationPoints[0].lat.toFixed(5)}, ${session.locationPoints[0].lng.toFixed(5)}` : (isCz ? 'Poloha neznámá' : 'Unknown location')}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button style={{ 
                      flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', 
                      color: '#60a5fa', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                    }}>
                       <Phone size={14} /> GHOST CALL
                    </button>
                    <button style={{ 
                      padding: '0.6rem', width: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', 
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                       <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tactical Map View (Simulated) */}
        {!isMobile && (
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} color="#3b82f6" />
              <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'white' }}>{t('tacticalOverview')}</span>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {/* Simplified World Grid Simulation */}
               <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
               <div style={{ textAlign: 'center', zIndex: 1 }}>
                  <MapPin size={40} color="#3b82f6" className="pulse-subtle" />
                  <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>{t('liveMapInterface')}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>{t('unitsTracking').replace('{count}', stats.active)}</div>
               </div>

               {/* Random Radar Dots */}
               {sessions.map((s, i) => (
                 <div key={i} style={{ 
                   position: 'absolute', 
                   top: `${30 + (i * 15) % 40}%`, 
                   left: `${20 + (i * 25) % 60}%`,
                   width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(s.state),
                   boxShadow: `0 0 10px ${getStatusColor(s.state)}`,
                   animation: 'pulse-subtle 2s infinite'
                 }} />
               ))}
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Clock size={14} color="#64748b" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{t('lastGlobalSync')}</span>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pulse-subtle { animation: pulse 2s infinite; }
        @keyframes pulse { 
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default SafetyGuardView;
