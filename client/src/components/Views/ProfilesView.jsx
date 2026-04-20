import React from 'react';
import { 
  Settings, ShieldCheck, UserPlus, X, CheckCircle, PlusCircle 
} from 'lucide-react';
import axios from 'axios';

import { useNexus } from '../../context/NexusContext';

const ProfilesView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    lang,
    token,
    activeRole,
    activeOperator,
    profiles: allAgencyProfiles,
    setProfiles,
    myProfiles,
    operators,
    assigningProfile,
    setAssigningProfile,
    setActiveProfileId,
    setActiveTab,
    toggleOperatorStatus,
    handleEditProfile,
    handleSaveAssignees,
    showToast,
    API_BASE
  } = nexus;
  return (
    <div data-testid="page-profiles-container" style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 data-testid="page-profiles-title" style={{ fontSize: '2rem', fontWeight: '800' }}>{t('managedProfiles')}</h2>
          {(activeRole === 'App Owner' || activeRole === 'Agency Manager' || activeRole === 'Agency Admin' || activeOperator?.role?.isManager) && (
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

      {isMobile && (activeRole === 'App Owner' || activeRole === 'Agency Manager' || activeRole === 'Agency Admin' || activeOperator?.role?.isManager) && (
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
        {(allAgencyProfiles || []).map((profile, i) => {
          const isMyProfile = (myProfiles || []).find(p => p.id === profile.id);
          const activeCount = ((profile.operators || []).filter(op => op.active).length || 0) + ((profile.assignees || []).length || 0);

          return (
            <div key={i} className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem', display: 'flex', gap: isMobile ? '1.5rem' : '2.5rem', borderColor: isMyProfile ? 'rgba(59, 130, 246, 0.4)' : 'var(--card-border)', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: isMobile ? '1 1 auto' : '0 0 250px' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>{profile.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: activeCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: activeCount > 0 ? 'var(--success-color)' : 'var(--error-color)', fontSize: '0.7rem', fontWeight: '900', border: '1px solid currentColor' }}>
                    {activeCount > 0 ? `${activeCount} ${t('operatorsActive')}` : t('noCoverage')}
                  </div>
                </div>
                <button
                  onClick={() => toggleOperatorStatus(profile.id, activeOperator?.id)}
                  className={`action-btn ${isMyProfile ? 'active' : ''}`}
                  style={{ background: isMyProfile ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent-color)', color: isMyProfile ? 'var(--error-color)' : 'white' }}
                >
                  {isMyProfile ? t('deactivateMySeat') : t('activateMySeat')}
                </button>
                <button
                  onClick={() => handleEditProfile(profile)}
                  style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--accent-color)', background: 'rgba(59, 130, 246, 0.1)', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Settings size={16} /> {t('editProfile')}
                </button>
                <button
                  onClick={() => {
                    setActiveProfileId(profile.id);
                    setActiveTab('inbox');
                  }}
                  style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                >
                  {t('openContext')}
                </button>

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
                  <div 
                    onClick={() => setAssigningProfile(profile)}
                    style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '15px', border: '1px dashed var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--accent-color)' }}
                  >
                     <UserPlus size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{t('manageTeam') || 'Manage Team'}</span>
                   </div>
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

              {/* Simple Inline User Selection Modal */}
              {assigningProfile?.id === profile.id && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Assign Operators to {profile.name}</h3>
                              <button onClick={() => setAssigningProfile(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}><X size={24} /></button>
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
                              onClick={() => setAssigningProfile(null)}
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
