import React from 'react';
import { 
  Settings, ShieldCheck, UserPlus, X, CheckCircle, PlusCircle, Key, Copy, Check 
} from 'lucide-react';
import axios from 'axios';

import { useNexus } from '../../context/ContextHook';

const ProfilesView = () => {
  const isProfileOnline = (p) => {
    if (!p) return false;
    const statusClean = String(p.status || '').toLowerCase();
    const isStatusOnline = statusClean === 'online' || statusClean === 'active';
    const hasActiveOperators = Array.isArray(p.operators) && p.operators.some(op => op.active);
    const hasAssignees = Array.isArray(p.assignees) && p.assignees.length > 0;
    return isStatusOnline || hasActiveOperators || hasAssignees;
  };

  const nexus = useNexus() || {};
  const {
    isMobile = false,
    t = (k) => k,
    lang = 'en',
    token = '',
    activeRole = '',
    activeOperator = null,
    profiles: allAgencyProfiles = [],
    setProfiles = () => {},
    myProfiles = [],
    operators = [],
    assigningProfile,
    setAssigningProfile = () => {},
    setActiveProfileId = () => {},
    setActiveTab = () => {},
    toggleOperatorStatus = () => {},
    handleEditProfile = () => {},
    handleSaveAssignees = () => {},
    showToast = () => {},
    API_BASE = ''
  } = nexus;
  
  const [localAssigningProfile, setLocalAssigningProfile] = React.useState(null);
  const [showCredsModal, setShowCredsModal] = React.useState(null);
  const [fetchingCreds, setFetchingCreds] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  // Use local state if context state is missing
  const currentAssigningProfile = assigningProfile || localAssigningProfile;
  const setCurrentAssigningProfile = setAssigningProfile || setLocalAssigningProfile;

  // Auto-scroll to active profile if coming from hierarchy
  const { activeProfileId } = nexus;
  React.useEffect(() => {
    if (activeProfileId && activeProfileId !== 'all') {
      const timer = setTimeout(() => {
        const element = document.getElementById(`profile-card-${activeProfileId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.ring = '4px solid var(--accent-color)';
          element.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.5)';
          
          // Remove highlight after a few seconds
          setTimeout(() => {
            element.style.ring = 'none';
            element.style.boxShadow = '';
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeProfileId]);

  const fetchAndShowCreds = async (profileId) => {
    setFetchingCreds(true);
    try {
      const resp = await axios.get(`${API_BASE}/profiles/${profileId}/credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCredsModal({ profileId, data: resp.data.credentials });
    } catch (_e) {
      showToast('Failed to fetch credentials', 'error');
    } finally {
      setFetchingCreds(false);
    }
  };

  const handleCopyAll = () => {
    if (!showCredsModal?.data) return;
    const text = JSON.stringify(showCredsModal.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div data-testid="page-profiles-container" style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 data-testid="page-profiles-title" style={{ fontSize: '2rem', fontWeight: '800' }}>{t('managedProfiles')}</h2>
          {(activeRole === 'app_owner' || activeRole === 'agency_manager' || activeRole === 'agency_admin' || activeRole === 'manager' || activeRole === 'senior_operator' || activeOperator?.isManager || activeOperator?.isSeniorOperator) && (
            <button
              onClick={async () => {
                const name = window.prompt(lang === 'cz' ? 'Jméno nového profilu (pracovní jméno):' : 'New profile name (stage name):');
                if (!name) return;
                const phone = window.prompt(lang === 'cz' ? 'Telefonní číslo (nebo ponech prázdné):' : 'Phone number (or leave empty):') || '';
                try {
                  const resp = await axios.post(`${API_BASE}/profiles`, { name, phoneNumber: phone || null }, { headers: { Authorization: `Bearer ${token}` } });
                  setProfiles(prev => [...prev, resp.data]);
                  showToast(lang === 'cz' ? `Profil "${name}" byl vytvořen` : `Profile "${name}" created`, 'success');
                } catch { showToast('Failed to create profile', 'error'); }
              }}
              data-testid="btn-add-profile" style={{ padding: '0.75rem 1.25rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              + {lang === 'cz' ? 'Přidat profil' : 'Add Profile'}
            </button>
          )}
        </div>
      )}

      {isMobile && (activeRole === 'app_owner' || activeRole === 'agency_manager' || activeRole === 'agency_admin' || activeRole === 'manager' || activeRole === 'senior_operator' || activeOperator?.isManager || activeOperator?.isSeniorOperator) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={async () => {
              const name = window.prompt(lang === 'cz' ? 'Jméno nového profilu:' : 'New profile name:');
              if (!name) return;
              try {
                const resp = await axios.post(`${API_BASE}/profiles`, { name }, { headers: { Authorization: `Bearer ${token}` } });
                setProfiles(prev => [...prev, resp.data]);
                showToast(lang === 'cz' ? `Profil "${name}" vytvořen` : `Profile "${name}" created`, 'success');
              } catch { showToast('Error', 'error'); }
            }}
            style={{ width: '100%', padding: '0.85rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.8rem' }}
          >
            + {lang === 'cz' ? 'PŘIDAT NOVÝ PROFIL' : 'ADD NEW PROFILE'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {(allAgencyProfiles || []).length === 0 && (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center', 
            background: 'var(--card-bg)', 
            borderRadius: '16px', 
            border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {lang === 'cz' ? 'Nebyly nalezeny žádné profily' : 'No profiles found'}
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              {lang === 'cz' ? 'Zkontrolujte přiřazení rolí nebo zkuste stránku obnovit.' : 'Check role assignments or try refreshing the page.'}
            </p>
          </div>
        )}
        {(allAgencyProfiles || []).map((profile, i) => {
          const isMyProfile = (myProfiles || []).find(p => p.id === profile.id);
          const isOnline = isProfileOnline(profile);
          const canManage = activeRole === 'app_owner' || activeRole === 'agency_manager' || activeRole === 'agency_admin' || activeRole === 'manager' || activeRole === 'senior_operator' || activeOperator?.isManager || activeOperator?.isSeniorOperator;

          return (
            <div key={i} id={`profile-card-${profile.id}`} data-testid={`profile-card-${profile.id}`} className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem', display: 'flex', gap: isMobile ? '1.5rem' : '2.5rem', borderColor: isMyProfile ? 'rgba(59, 130, 246, 0.4)' : 'var(--card-border)', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: isMobile ? '1 1 auto' : '0 0 250px' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>{profile.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    padding: '0.3rem 0.8rem', 
                    borderRadius: '8px', 
                    background: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                    color: isOnline ? '#34d399' : 'var(--text-secondary)', 
                    fontSize: '0.75rem', 
                    fontWeight: '900', 
                    border: '1px solid',
                    borderColor: isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: isOnline ? '0 0 20px rgba(52, 211, 153, 0.15)' : 'none'
                  }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: isOnline ? '#34d399' : 'rgba(255,255,255,0.2)',
                      animation: isOnline ? 'pulse-green 2s infinite' : 'none'
                    }} />
                    {isOnline ? (lang === 'cz' ? 'ONLINE / AKTIVNÍ' : 'LIVE / ACTIVE') : (lang === 'cz' ? 'OFFLINE / BEZ POKRYTÍ' : 'OFFLINE / NO COVERAGE')}
                  </div>
                  {profile.lastOnline && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      {lang === 'cz' ? 'Naposledy online:' : 'Last online:'} {new Date(profile.lastOnline).toLocaleString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={() => toggleOperatorStatus(profile.id, activeOperator?.id)}
                    data-testid={`profile-status-toggle-${profile.id}`}
                    className={`action-btn ${isMyProfile ? 'active' : ''}`}
                    style={{ 
                      background: isMyProfile ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-color)', 
                      color: isMyProfile ? '#ef4444' : 'white',
                      border: isMyProfile ? '1px solid #ef4444' : 'none',
                      width: '100%',
                      margin: 0,
                      textTransform: 'none',
                      fontWeight: '800'
                    }}
                  >
                    {isMyProfile ? t('uvolnitMisto') || 'Uvolnit moje místo' : t('activateMySeat')}
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleEditProfile(profile)}
                      data-testid={`profile-edit-button-${profile.id}`}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <Settings size={16} /> {t('editProfile')}
                    </button>
                    {canManage && (
                      <button
                        onClick={() => fetchAndShowCreds(profile.id)}
                        data-testid={`profile-credentials-button-${profile.id}`}
                        disabled={fetchingCreds}
                        title={t('viewCredentials')}
                        style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Key size={16} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActiveProfileId(profile.id);
                      setActiveTab('inbox');
                    }}
                    data-testid={`profile-open-button-${profile.id}`}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                  >
                    {t('openContext')}
                  </button>

                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'STATISTIKY PROFILU' : 'PROFILE STATS'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{lang === 'cz' ? 'TRŽBY' : 'REVENUE'}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>{profile.stats?.revenue || '0 Kč'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{lang === 'cz' ? 'ZPRÁVY' : 'MESSAGES'}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>{profile.stats?.messages || '0'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('assignedTeam') || 'PROTECTIVE TEAM / ASSIGNEES'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {(profile.assignees || profile.operators || []).map(profileOp => {
                    const opData = (operators || []).find(o => o.id === profileOp.id);
                    const displayName = opData?.name || profileOp.name || profileOp.id;
                    const displayRole = (opData?.role?.name || opData?.role || '');
                    return (
                      <div key={profileOp.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '900' }}>{(opData?.avatar) || displayName.substring(0,2).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{displayName}</div>
                          {displayRole && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{displayRole}</div>}
                        </div>
                        <ShieldCheck size={16} color="var(--accent-color)" />
                      </div>
                    );
                  })}
                  {canManage && (
                    <div 
                      onClick={() => setCurrentAssigningProfile(profile)}
                      style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '15px', border: '1px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--accent-color)', borderStyle: 'solid' }}
                    >
                       <UserPlus size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{t('manageTeam')}</span>
                     </div>
                  )}
                </div>
              </div>

              {/* Quick Replies for this profile */}
              {(profile.quickReplies || []).length > 0 && (
                <div style={{ marginTop: isMobile ? '1.5rem' : 0, flex: '0 0 auto', minWidth: isMobile ? '100%' : '220px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>RYCHLÉ ODPOVĚDI</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(profile.quickReplies || []).map(reply => (
                      <div key={reply.id} style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981' }}>{reply.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{reply.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Credentials Modal */}
              {showCredsModal?.profileId === profile.id && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', border: '1px solid var(--accent-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Key size={20} color="var(--accent-color)" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>{t('credentialsTitle')}</h3>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{profile.name}</div>
                        </div>
                      </div>
                      <button onClick={() => setShowCredsModal(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                      {showCredsModal.data ? (
                        Object.entries(showCredsModal.data).map(([platform, creds], idx) => (
                          <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--accent-color)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{platform}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{creds.username || creds.email || 'N/A'}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{creds.password || '••••••••'}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t('credentialsNotFound')}</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={handleCopyAll}
                        style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: copied ? '#22c55e' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? t('credentialsCopied') : t('credentialsCopy')}
                      </button>
                      <button 
                        onClick={() => setShowCredsModal(null)}
                        style={{ padding: '0.85rem 1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '800', cursor: 'pointer' }}
                      >
                        {t('close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Simple Inline User Selection Modal (Assignees) */}
              {currentAssigningProfile?.id === profile.id && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Assign Operators to {profile.name}</h3>
                              <button onClick={() => setCurrentAssigningProfile(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}><X size={24} /></button>
                          </div>
                          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                              {(operators || []).filter(op => !op.isAppOwner && op.role !== 'Model').map(op => {
                                  const isAssigned = (profile.assignees || []).some(a => a.id === op.id) || (profile.operators || []).some(o => o.id === op.id);
                                  return (
                                      <div 
                                          key={op.id} 
                                          onClick={() => {
                                              const current = (profile.assignees || []).map(a => a.id) || [];
                                              const next = current.includes(op.id) ? current.filter(id => id !== op.id) : [...current, op.id];
                                              handleSaveAssignees(profile.id, next);
                                          }}
                                          style={{ 
                                              padding: '1rem', 
                                              background: isAssigned ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', 
                                              borderRadius: '12px', 
                                              border: `1px solid ${isAssigned ? 'var(--accent-color)' : 'var(--card-border)'}`, 
                                              display: 'flex', 
                                              justifyContent: 'space-between',
                                              cursor: 'pointer'
                                          }}
                                      >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{op.avatar}</div>
                                              <div>
                                                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{op.name}</div>
                                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{op.role}</div>
                                              </div>
                                          </div>
                                          {isAssigned ? <CheckCircle size={20} color="var(--accent-color)" /> : <PlusCircle size={20} color="var(--text-secondary)" />}
                                      </div>
                                  );
                              })}
                          </div>
                          <button 
                              onClick={() => setCurrentAssigningProfile(null)}
                              className="action-btn" 
                              style={{ background: 'var(--accent-color)', color: 'white', width: '100%', margin: 0 }}
                          >
                              DONE
                          </button>
                      </div>
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfilesView;
