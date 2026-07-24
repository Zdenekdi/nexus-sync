import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Shield, ShieldCheck, MapPin, Activity, Battery, Clock, AlertTriangle, CheckCircle2, User, Phone, Zap, Search, Filter, RefreshCw, Eye, Settings } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';
import { isFeatureLocked } from '../../config/featureLocks';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';



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
  
  const isCz = lang === 'cz' || lang === 'cs';

  // Živá mapa polohy závisí na sledování polohy (telefon i fyzický tracker).
  // Dokud jsou oba zdroje uzamčené (neověřené), mapa nemá odkud brát data —
  // ukážeme místo prázdné mapy zámek, ať operátor nespoléhá na nefunkční přehled.
  const locationLocked = isFeatureLocked('phone-tracking') && isFeatureLocked('physical-tracker');

  // Leaflet state & refs
  const [L, setL] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Dynamically load Leaflet at runtime
  useEffect(() => {
    import('leaflet').then(module => {
      const leaflet = module.default && module.default.map ? module.default : module;
      setL(leaflet);
    }).catch(err => {
      console.error('Failed to load Leaflet:', err);
    });
  }, []);

  const processedSessions = useMemo(() => Array.isArray(sessions) ? sessions : [], [sessions]);

  const filteredSessions = useMemo(() => {
    return processedSessions.filter(s => {
      const name = s.profile?.name || '';
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || s.state?.toLowerCase() === filter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [processedSessions, search, filter]);

  const getCoordinates = useCallback((session) => {
    const candidates = [session.locationPoints?.[0], session.trackerLocations?.[0]];
    for (const point of candidates) {
      const lat = Number(point?.lat);
      const lng = Number(point?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  }, []);

  const getSessionBattery = useCallback((session) => {
    const raw = session.trackerLocations?.[0]?.battery ?? session.battery ?? session.deviceBattery;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const getSessionHeartRate = useCallback((session) => {
    const raw = session.heartRate ?? session.bpm ?? session.vitals?.heartRate;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const getStatusColor = useCallback((state) => {
    switch (state) {
      case 'ESCALATED': return '#ef4444';
      case 'GRACE': return '#f59e0b';
      case 'CHECKED_IN': return '#10b981';
      default: return '#64748b';
    }
  }, []);

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (!token || !API_BASE) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await axios.get(`${API_BASE}/safety/sessions/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data || [];
      setSessions(data);
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

    return () => {
      clearInterval(interval);
    };
  }, [fetchSessions, fetchSettings]);

  // Initialize Map
  useEffect(() => {
    if (!L || !mapContainerRef.current) return;
    
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([52.5, -1.5], 6);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [L]);

  // Update markers when filteredSessions change
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return;

    // Clear old markers
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    if (filteredSessions.length === 0) return;

    const newMarkers = [];
    filteredSessions.forEach(session => {
      const coords = getCoordinates(session);
      if (!coords) return;
      const color = getStatusColor(session.state);
      
      const markerIcon = L.divIcon({
        className: 'leaflet-custom-marker-container',
        html: `
          <div class="custom-leaflet-marker status-${session.state.toLowerCase()}" style="color: ${color}">
            <div class="pulsing-ring"></div>
            <div class="center-dot"></div>
            <div class="marker-label" style="border-color: ${color}">${session.profile?.name || ''}</div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: markerIcon })
        .addTo(mapInstanceRef.current);

      marker.on('click', () => {
        const element = document.getElementById(`safety-session-card-${session.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.boxShadow = `0 0 25px ${color}`;
          setTimeout(() => {
            element.style.boxShadow = session.state === 'ESCALATED' ? '0 0 20px rgba(239, 68, 68, 0.1)' : 'none';
          }, 2000);
        }
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    // Zoom/fit bounds to show all markers
    try {
      const group = L.featureGroup(newMarkers);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15), {
        maxZoom: 14,
        animate: true
      });
    } catch (e) {
      console.error('Failed to fit bounds:', e);
    }
  }, [L, filteredSessions, getCoordinates, getStatusColor]);

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

  const stats = useMemo(() => ({
    total: processedSessions.length,
    active: processedSessions.filter(s => s.state === 'CHECKED_IN').length,
    warning: processedSessions.filter(s => s.state === 'GRACE').length,
    sos: processedSessions.filter(s => s.state === 'ESCALATED').length,
  }), [processedSessions]);

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
          {loading && processedSessions.length === 0 ? (
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
                  {(() => {
                    const bpm = getSessionHeartRate(session);
                    const battery = getSessionBattery(session);
                    const coords = getCoordinates(session);
                    return (
                      <>
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
                       <Activity size={14} color="#ef4444" className={bpm && bpm > 90 ? 'heart-pulse' : ''} />
                       <div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('heartRate')}</div>
                          <div data-testid={`safety-bpm-${session.id}`} style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>{bpm ? `${bpm} BPM` : '--'}</div>
                       </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Battery size={14} color={battery !== null && battery < 20 ? '#ef4444' : '#10b981'} />
                       <div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('battery')}</div>
                          <div data-testid={`safety-battery-${session.id}`} style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>{battery !== null ? `${battery}%` : '--'}</div>
                       </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <MapPin size={12} />
                    {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : t('unknownLocation')}
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
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tactical Map View (Leaflet) */}
        {!isMobile && (
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} color="#3b82f6" />
              <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'white' }}>{t('tacticalOverview')}</span>
            </div>
            {locationLocked ? (
              <div style={{ flex: 1, minHeight: '350px', background: '#090d16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', gap: '0.85rem' }}>
                <div style={{ fontSize: '2rem', lineHeight: 1 }}>🔒</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white' }}>
                  {isCz ? 'Živá mapa polohy se dokončuje' : 'Live location map in testing'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.5 }}>
                  {isCz
                    ? 'Sledování polohy (telefon i fyzické trackery) se ještě testuje, takže se poloha zatím nezobrazuje. Nespoléhej na tuto mapu pro dohled nad polohou.'
                    : 'Location tracking (phone and physical trackers) is still being tested, so positions are not shown yet. Do not rely on this map for location monitoring.'}
                </div>
              </div>
            ) : (
              <div
                ref={mapContainerRef}
                style={{ flex: 1, minHeight: '350px', background: '#090d16' }}
              />
            )}
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
        
        /* Custom Leaflet Marker Styling */
        .leaflet-custom-marker-container {
          background: transparent !important;
          border: none !important;
        }
        .custom-leaflet-marker {
          position: relative;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .custom-leaflet-marker .pulsing-ring {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid currentColor;
          animation: marker-pulse 2s infinite;
          opacity: 0.8;
          pointer-events: none;
        }
        .custom-leaflet-marker .center-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: currentColor;
          border: 2px solid #090d16;
          z-index: 2;
        }
        .custom-leaflet-marker .marker-label {
          position: absolute;
          left: 24px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(9, 13, 22, 0.95);
          border: 1px solid currentColor;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 800;
          color: #ffffff;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          z-index: 10;
        }
        .custom-leaflet-marker.status-checked_in {
          color: #10b981;
        }
        .custom-leaflet-marker.status-grace {
          color: #f59e0b;
        }
        .custom-leaflet-marker.status-escalated {
          color: #ef4444;
        }
        @keyframes marker-pulse {
          0% {
            transform: scale(0.4);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SafetyGuardView;
