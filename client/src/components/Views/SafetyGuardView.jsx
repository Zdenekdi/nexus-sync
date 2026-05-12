import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, MapPin, Activity, Battery, Clock, AlertTriangle, CheckCircle2, User, Phone, Zap, Search, Filter, RefreshCw, Eye, Settings } from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState(false);
  const [safetySettings, setSafetySettings] = useState({
    audioSentinelEnabled: true,
    audioSentinelInterval: 300,
    audioSentinelVolume: 0.5
  });
  
  // Simulated heart rates and battery levels
  const [simData, setSimData] = useState({});

  const isCz = lang === 'cz' || lang === 'cs';

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (!token || !API_BASE) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await axios.get(`${API_BASE}/safety/sessions/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data || [];
      setSessions(data);
      
      // Initialize sim data for new sessions
      setSimData(prev => {
        const next = { ...prev };
        data.forEach(s => {
          if (!next[s.id]) {
            next[s.id] = {
              bpm: 70 + Math.floor(Math.random() * 20),
              battery: 85 + Math.floor(Math.random() * 15)
            };
          }
        });
        return next;
      });
    } catch (_err) {
      console.error('Failed to fetch safety sessions:', _err);
      if (_err.response?.status !== 404) {
        showToast(t('dataLoadError'), 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_BASE, token, t, showToast]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/safety/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSafetySettings(res.data);
    } catch (_err) {
      console.error('Failed to fetch safety settings');
    }
  }, [API_BASE, token]);

  useEffect(() => {
    fetchSessions();
    fetchSettings();
    const interval = setInterval(() => fetchSessions(true), 15000);
    
    // Sim pulse effect
    const simInterval = setInterval(() => {
      setSimData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[id].bpm += (Math.random() > 0.5 ? 1 : -1);
          if (next[id].bpm < 60) next[id].bpm = 62;
          if (next[id].bpm > 110) next[id].bpm = 108;
          if (Math.random() > 0.98) next[id].battery -= 1;
        });
        return next;
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(simInterval);
    };
  }, [fetchSessions, fetchSettings]);

  const handleGhostCall = async (profileId) => {
    try {
      await axios.post(`${API_BASE}/safety/ghost-call`, { profileId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(isCz ? 'Ghost Call byl iniciován' : 'Ghost Call initiated', 'success');
    } catch (_err) {
      showToast('Error', 'error');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await axios.patch(`${API_BASE}/safety/settings`, safetySettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSettings(false);
      showToast(isCz ? 'Nastavení uloženo' : 'Settings saved', 'success');
    } catch (_err) {
      showToast('Error', 'error');
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.profile?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || s.state?.toLowerCase() === filter.toLowerCase();
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
    <div data-testid="page-safety-container" style={{ padding: isMobile ? '1rem' : '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.03), transparent)' }}>
      {/* Header & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ background: '#3b82f6', padding: '5px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="white" />
            </div>
            <h2 style={{ margin: 0, fontWeight: 950, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              {t('safetyGuard').split(' ')[0]} <span style={{ color: '#3b82f6' }}>{t('safetyGuard').split(' ')[1]}</span>
            </h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Activity size={12} color="#10b981" /> {t('realTimeMonitoringActive')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: t('total'), value: stats.total, color: 'white' },
            { label: t('active'), value: stats.active, color: '#10b981' },
            { label: t('grace'), value: stats.warning, color: '#f59e0b' },
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
          <button onClick={() => setShowSettings(true)} data-testid="safety-settings-button" style={{ 
            width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white'
          }}>
            <Settings size={18} />
          </button>
          <button onClick={() => fetchSessions(true)} data-testid="safety-refresh-button" style={{ 
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
            data-testid="safety-search-input"
            type="text" 
            placeholder={t('searchModel')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              data-testid={`safety-filter-${f.toLowerCase().replace('_', '-')}`}
            >
              {f === 'all' ? t('all').toUpperCase() : (f === 'CHECKED_IN' ? t('active').toUpperCase() : (f === 'GRACE' ? t('grace').toUpperCase() : (f === 'ESCALATED' ? t('escalated').toUpperCase() : f.replace('_', ' ').toUpperCase())))}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* Sessions Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }} className="custom-scrollbar pr-4">
          {loading && sessions.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div data-testid="safety-no-sessions" style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--card-border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t('noActiveSessions')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {filteredSessions.map(session => (
                <div key={session.id} data-testid={`safety-session-card-${session.id}`} style={{ 
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
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: getStatusColor(session.state), textTransform: 'uppercase' }}>
                          {session.state === 'CHECKED_IN' ? t('active') : (session.state === 'GRACE' ? t('grace') : (session.state === 'ESCALATED' ? t('escalated') : session.state))}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '4px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                       {session.locationType === 'incall' ? `🏠 ${t('incall').toUpperCase()}` : `🚗 ${t('outcall').toUpperCase()}`}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Activity size={14} color="#ef4444" className={simData[session.id]?.bpm > 90 ? 'heart-pulse' : ''} />
                       <div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('heartRate')}</div>
                          <div data-testid={`safety-bpm-${session.id}`} style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>{simData[session.id]?.bpm || 72} BPM</div>
                       </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Battery size={14} color={simData[session.id]?.battery < 20 ? '#ef4444' : '#10b981'} />
                       <div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('battery')}</div>
                          <div data-testid={`safety-battery-${session.id}`} style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>{simData[session.id]?.battery || 100}%</div>
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <MapPin size={12} />
                    {session.locationPoints?.[0] ? `${session.locationPoints[0].lat.toFixed(5)}, ${session.locationPoints[0].lng.toFixed(5)}` : t('unknownLocation')}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <button 
                      onClick={() => handleGhostCall(session.profileId)}
                      data-testid={`safety-ghostcall-button-${session.id}`}
                      style={{ 
                        flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', 
                        color: '#60a5fa', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                      }}
                    >
                       <Phone size={14} /> {t('ghostCall')}
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
               <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
               <div style={{ textAlign: 'center', zIndex: 1 }}>
                  <MapPin size={40} color="#3b82f6" className="pulse-subtle" />
                  <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>{t('liveMapInterface')}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>{t('unitsTracking').replace('{count}', stats.active)}</div>
               </div>

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

      {/* Safety Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div data-testid="safety-settings-modal" className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={24} color="#3b82f6" /> {isCz ? 'Nastavení bezpečnosti' : 'Safety Settings'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>Audio Sentinel</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Diskrétní pípání v aplikaci</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={safetySettings.audioSentinelEnabled}
                  onChange={(e) => setSafetySettings({...safetySettings, audioSentinelEnabled: e.target.checked})}
                  style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>INTERVAL PÍPÁNÍ (sekundy)</label>
                <input 
                  type="number" 
                  value={safetySettings.audioSentinelInterval}
                  onChange={(e) => setSafetySettings({...safetySettings, audioSentinelInterval: e.target.value})}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>HLASITOST</label>
                <input 
                  type="range" min="0" max="1" step="0.1"
                  value={safetySettings.audioSentinelVolume}
                  onChange={(e) => setSafetySettings({...safetySettings, audioSentinelVolume: e.target.value})}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '800', cursor: 'pointer' }}>ZRUŠIT</button>
                <button onClick={handleUpdateSettings} data-testid="safety-settings-save" style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>ULOŽIT</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pulse-subtle { animation: pulse 2s infinite; }
        @keyframes pulse { 
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .heart-pulse { animation: heart-pulse 0.8s infinite; color: #ef4444 !important; }
        @keyframes heart-pulse {
          0% { transform: scale(1); }
          15% { transform: scale(1.3); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15); }
          60% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SafetyGuardView;
