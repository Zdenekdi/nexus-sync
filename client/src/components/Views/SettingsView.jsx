import React from 'react';
import { 
  Activity, Building2, Smartphone, ShieldCheck, Lock 
} from 'lucide-react';

import { useNexus } from '../../context/NexusContextCore';

const SettingsView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    lang,
    activeRole,
    activeOperator,
    agencies,
    operators: availableOperators,
    sessions,
    profiles,
    handleRevokeBinding,
    agencySettings,
    updateAgencySettings,
    departureIntervalMin,
    setDepartureIntervalMin,
    isMaintenanceMode,
    setIsMaintenanceMode,
    globalAnnouncement,
    setGlobalAnnouncement,
    isAllowed,
    showToast
  } = nexus;

  const activeClient = agencies[0]; // Logic for multi-agency can be added later
  return (
    <div data-testid="page-settings-container" style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('controlCenter')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>{t('configSubtitle')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '800px' }}>
        {activeRole === 'App Owner' && (
          <div className="settings-section">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--success-color)" /> Platform Health Snapshot
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ACTIVE SESSIONS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>32</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>DB LATENCY</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--success-color)' }}>12ms</div>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>OUTGOING NODES</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>4</div>
              </div>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="var(--accent-color)" /> Osobní předvolby / Personal Preferences
          </h3>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700' }}>{lang === 'cz' ? 'Jazyk aplikace' : 'Application Language'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lang === 'cz' ? 'Vyberte preferovaný jazyk uživatelského rozhraní.' : 'Select your preferred user interface language.'}</div>
              </div>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '12px', border: '1px solid var(--card-border)', width: '120px' }}>
                <button 
                  onClick={() => nexus.setLang('cz')} 
                  style={{ flex: 1, padding: '8px 0', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '9px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}
                >CZ</button>
                <button 
                  onClick={() => nexus.setLang('en')} 
                  style={{ flex: 1, padding: '8px 0', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '9px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}
                >EN</button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} color="#a78bfa" /> {lang === 'cz' ? 'Bezpečnostní PIN' : 'Security PIN'}
          </h3>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {lang === 'cz' 
                    ? 'Nastavte si 4-místný PIN pro ochranu citlivých operací (mazání, finanční reporty).' 
                    : 'Set a 4-digit PIN to protect sensitive operations (deletion, financial reports).'}
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                   <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>NOVÝ PIN (4 ČÍSLICE)</label>
                      <input 
                        type="password" 
                        maxLength={4} 
                        placeholder="****"
                        id="new-security-pin"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '10px', color: 'white', letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900' }} 
                      />
                   </div>
                   <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>POTVRZENÍ HESLEM</label>
                      <input 
                        type="password" 
                        placeholder="Vaše heslo k účtu"
                        id="pin-auth-password"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '10px', color: 'white' }} 
                      />
                   </div>
                </div>
                
                <button 
                  onClick={async () => {
                    const pin = document.getElementById('new-security-pin').value;
                    const password = document.getElementById('pin-auth-password').value;
                    if (!pin || pin.length < 4 || !password) {
                      return showToast(lang === 'cz' ? 'Vyplňte 4-místný PIN a heslo.' : 'Enter 4-digit PIN and password.', 'error');
                    }
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api'}/auth/security-pin`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nexus.token}` },
                        body: JSON.stringify({ pin, password })
                      });
                      if (res.ok) {
                        showToast(lang === 'cz' ? 'PIN úspěšně nastaven.' : 'PIN set successfully.', 'success');
                        document.getElementById('new-security-pin').value = '';
                        document.getElementById('pin-auth-password').value = '';
                      } else {
                        const data = await res.json();
                        showToast(data.message || 'Error', 'error');
                      }
                    } catch {
                      showToast('Network _err', 'error');
                    }
                  }}
                  className="action-btn" 
                  style={{ width: 'fit-content', padding: '0.75rem 2rem', background: '#a78bfa', marginTop: '0.5rem' }}
                >
                  {lang === 'cz' ? 'ULOŽIT PIN' : 'SAVE PIN'}
                </button>
             </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="var(--accent-color)" /> 
            {activeRole === 'App Owner' ? 'Agency Information' : t('agencyInsight')}: {activeClient?.name || t('global')}
          </h3>
          <div className="grid" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('teamSeats')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{(availableOperators || []).length} / 10</div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('regionalReach')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{activeClient?.region || t('global')}</div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={20} color="var(--accent-color)" /> {t('sessionTopology')}
          </h3>
          <div className="glass-card" style={{ padding: 0 }}>
            {(() => {
              const isManager = activeRole === 'App Owner' || activeRole === 'Agency Admin' || activeRole === 'Agency Manager' || activeOperator?.role?.isManager;
              const visibleSessions = (sessions || []).filter(s => {
                if (isManager) return true;
                const sessionProfile = (profiles || []).find(p => p.id === s.profileId);
                return sessionProfile?.agencyId === activeOperator?.agencyId;
              });
              if (visibleSessions.length === 0) return (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noDevicesConnected') || 'No active device bindings found.'}</div>
              );
              return visibleSessions.map((s, i) => (
                <div key={i} style={{ padding: '1.5rem', borderBottom: i < visibleSessions.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {!s.profileId && (
                    <div style={{ width: '100%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', marginBottom: '0.5rem' }}>
                      ⚠️ {lang === 'cz' ? 'Žádný profil přiřazen — SMS relay nefunguje. Přiřaďte profil a spárujte znovu.' : 'No profile assigned — SMS relay disabled. Assign a profile then re-pair.'}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ background: !s.profileId ? 'rgba(245,158,11,0.1)' : (s.current || s.status === 'Active') ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>
                      <Smartphone size={20} color={!s.profileId ? '#f59e0b' : (s.current || s.status === 'Active') ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700' }}>{s.device} {s.current && <span style={{ color: 'var(--success-color)', fontSize: '0.7rem' }}>({t('thisDevice')})</span>}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.location} • {s.status}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      title={lang === 'cz' ? 'Zobrazit polohu zařízení' : 'Show device location'}
                      onClick={() => {
                        if (s.lat && s.lng) {
                          window.open(`https://www.google.com/maps?q=${s.lat},${s.lng}`, '_blank');
                        } else {
                          showToast(lang === 'cz' ? 'Poloha momentálně není k dispozici' : 'Location not available', 'info');
                        }
                      }}
                      style={{ padding: '0.4rem 0.75rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      📍 {lang === 'cz' ? 'Poloha' : 'Location'}
                    </button>
                    {(isManager || s.profileId === activeOperator?.profileId) && (
                      <div
                        className="status-badge"
                        style={{ cursor: s.status === 'Active' ? 'pointer' : 'default', opacity: s.status === 'Active' ? 1 : 0.5 }}
                        onClick={() => s.status === 'Active' && handleRevokeBinding(s.installationId)}
                      >
                        {s.status === 'Active' ? t('revoke') : t('revoked') || 'REVOKED'}
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--accent-color)" /> {t('safetyGuardHeading') || 'Safety Guard Configuration'}
          </h3>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '1rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0' }}>
              <div>
                <div style={{ fontWeight: '700' }}>{t('safetyAlertMode') || 'Emergency Alert Routing'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('safetyAlertModeDesc') || 'Choose who receives push notifications during a panic alert.'}</div>
              </div>
              <select 
                value={agencySettings?.safetyAlertMode || 'MANAGERS_AND_ASSIGNED'}
                onChange={(_err) => updateAgencySettings({ safetyAlertMode: _err.target.value })}
                className="glass-input"
                style={{ width: isMobile ? '100%' : 'auto', padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-color)', color: 'white', fontWeight: '700' }}
              >
                <option value="MANAGERS_AND_ASSIGNED">{t('modeManagersAndAssigned') || 'Managers + Assigned Operators'}</option>
                <option value="ASSIGNED_ONLY">{t('modeAssignedOnly') || 'Strictly Assigned Operators Only'}</option>
              </select>
            </div>
            {/* Departure Interval Setting */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.75rem' : '0' }}>
              <div>
                <div style={{ fontWeight: '700' }}>Interval odchodu klienta</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Modelka musí potvrdit odchod klienta do X minut po check-outu, jinak jde bezpečnostní alert.</div>
              </div>
              <select
                value={departureIntervalMin}
                onChange={(_err) => {
                  const v = parseInt(_err.target.value, 10);
                  setDepartureIntervalMin(v);
                  localStorage.setItem('nexus_departure_interval', String(v));
                }}
                className="glass-input"
                style={{ width: isMobile ? '100%' : 'auto', padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid var(--accent-color)', color: 'white', fontWeight: '700' }}
              >
                {[5, 10, 15, 20, 30].map(m => <option key={m} value={m}>{m} minut</option>)}
              </select>
            </div>
          </div>
        </div>

        {activeRole === 'App Owner' && (
          <div className="settings-section">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} color="var(--accent-color)" /> Platform Management (App Owner Only)
            </h3>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>Maintenance Mode</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Restrict access to all non-admin users for scheduled maintenance.</div>
                </div>
                <div 
                  className={`status-badge ${isMaintenanceMode ? 'active' : ''}`} 
                  style={{ cursor: 'pointer', background: isMaintenanceMode ? 'var(--_err-color)' : 'rgba(255,255,255,0.06)' }}
                  onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                >
                  {isMaintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                <div style={{ fontWeight: '700', marginBottom: '0.75rem' }}>Global Announcement Banner</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    className="glass-input" 
                    placeholder="Type an announcement to show to all users..." 
                    style={{ flex: 1, padding: '0.75rem' }}
                    value={globalAnnouncement}
                    onChange={(_err) => setGlobalAnnouncement(_err.target.value)}
                  />
                  <button className="action-btn" style={{ width: 'auto', padding: '0 1.5rem' }} onClick={() => showToast('Announcement published!', 'success')}>PUBLISH</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isAllowed('global_features') && (
          <div className="settings-section">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               Advanced Features
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Additional configuration for this agency.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
