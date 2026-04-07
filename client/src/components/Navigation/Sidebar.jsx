import React, { useState } from 'react';
import { 
  LayoutDashboard, MessageSquare, Calendar, Users, BarChart3, 
  Settings, Activity, Radio, Globe, Smartphone, FileSearch, 
  Shield, Building2, HardDrive, CreditCard, Zap,
  LogOut, Menu, X, Circle
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const Sidebar = () => {
  const nexus = useNexus();
  const { 
    activeTab, setActiveTab, t, lang, setLang, 
    activeOperator, logout, isMobile, 
    totalUnread, myProfiles,
    activeProfile, setActiveProfileId, activeRole,
    isSidebarCollapsed, isAllowed,
    onlineOnly, setOnlineOnly
  } = nexus;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigation = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  // Get display name and role with safe fallbacks
  const displayName = activeOperator?.name || '';
  const displayRoleString = activeOperator?.originalRole || activeRole || '';
  const displayAvatar = activeOperator?.avatar || (displayName ? displayName.charAt(0) : '');

  if (isMobile && !isMobileMenuOpen) {
    return (
      <div style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 1000 }}>
        <button onClick={() => setIsMobileMenuOpen(true)} className="glass-card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid var(--card-border)' }}>
          <Menu size={20} />
        </button>
      </div>
    );
  }

  const TooltipItem = ({ label, children }) => {
    if (isMobile) return <>{children}</>;
    return (
      <div style={{ position: 'relative' }} className="sidebar-tooltip-wrap">
        {children}
        {isSidebarCollapsed && (
          <span className="sidebar-tooltip-text">{label}</span>
        )}
      </div>
    );
  };

  return (
    <>
    <style>{`
      .sidebar-tooltip-wrap {
        pointer-events: none;
      }
      .sidebar-tooltip-wrap > * {
        pointer-events: auto;
      }
      .sidebar-tooltip-wrap .sidebar-tooltip-text {
        display: none;
        position: absolute;
        left: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
        background: rgba(15,23,42,0.95);
        color: white;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        white-space: nowrap;
        pointer-events: none;
        z-index: 9999;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .sidebar-tooltip-wrap:hover .sidebar-tooltip-text {
        display: block;
      }
    `}</style>
    <nav className={isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} style={{
      width: isMobile ? '100vw' : (isSidebarCollapsed ? '80px' : '280px'),
      height: isMobile ? '100dvh' : '100%',
      background: 'rgba(10, 12, 16, 0.98)',
      backdropFilter: 'blur(20px)',
      borderRight: isMobile ? 'none' : '1px solid var(--card-border)',
      padding: isSidebarCollapsed ? '1.5rem 0' : '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      position: isMobile ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      zIndex: 1100,
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      overflowY: 'hidden'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: isMobile ? '0' : '0' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: (isMobile || !isSidebarCollapsed) ? 'space-between' : 'center', width: '100%' }}>
            <div onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}>
              <div style={{ width: isSidebarCollapsed ? '42px' : '48px', height: isSidebarCollapsed ? '42px' : '48px', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative' }}>
                <img src="/nexus_icon.png" alt="Nexus Hub" style={{ width: '100%', height: '100%', borderRadius: '12px', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }} />
              </div>
              {(!isSidebarCollapsed || isMobile) && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Nexus Hub</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: '800', letterSpacing: '0.15em', marginTop: '0.15rem' }}>PREMIUM SYNC</span>
                </div>
              )}
            </div>
            {isMobile && <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>}
          </div>
          
          {(!isSidebarCollapsed || isMobile) && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '3px', borderRadius: '12px', border: '1px solid var(--card-border)', gap: '0.5rem' }}>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '9px', flex: 1 }}>
                <button onClick={() => setLang('cz')} style={{ flex: 1, padding: '4px 0', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '7px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}>CZ</button>
                <button onClick={() => setLang('en')} style={{ flex: 1, padding: '4px 0', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '7px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer' }}>EN</button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', marginRight: '-0.75rem', paddingRight: '0.75rem' }} className="custom-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TooltipItem label={capitalize(t('dashboard'))}>
              <button onMouseDown={() => handleNavigation('dashboard')} onClick={() => handleNavigation('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === 'dashboard' ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                <LayoutDashboard size={20} color={activeTab === 'dashboard' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                {!isSidebarCollapsed && <span style={{ color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'dashboard' ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(t('dashboard'))}</span>}
              </button>
            </TooltipItem>

            {activeRole === 'App Owner' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {[
                    { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
                    { id: 'infra', icon: Activity, label: t('infrastructure'), perm: 'infrastructure' },
                    { id: 'maintenance', icon: HardDrive, label: t('maintenance'), perm: 'maintenance' },
                    { id: 'permissions', icon: Shield, label: t('permissions'), perm: 'permissions' },
                    { id: 'plans', icon: CreditCard, label: t('plansManagement'), perm: 'plans' },
                    { id: 'features', icon: Zap, label: t('features'), perm: 'global_features' },
                  ].map(item => (
                    <TooltipItem key={item.id} label={capitalize(item.label)}>
                      <button onMouseDown={() => handleNavigation(item.id)} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                        {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                      </button>
                    </TooltipItem>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {[
                    { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: totalUnread, perm: 'messaging' },
                    { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                    { id: 'safety', icon: Shield, label: t('safety'), perm: 'safety' },
                    { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                    { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                    { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
                    { id: 'relay', icon: Radio, label: t('relay') || 'Relay', perm: 'relay' },
                    { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
                    { id: 'hierarchy', icon: Users, label: t('hierarchy'), perm: 'hierarchy' },
                    { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                    { id: 'activity', icon: Activity, label: t('activity'), perm: 'analytics' },
                    { id: 'plans', icon: CreditCard, label: t('plansManagement'), perm: 'plans' },
                    { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
                    { id: 'referrals', icon: Zap, label: t('referrals'), perm: 'referrals' },
                  ].filter(item => {
                    return !item.perm || isAllowed(item.perm);
                  }).map(item => (
                    <TooltipItem key={item.id} label={capitalize(item.label)}>
                      <button onMouseDown={() => handleNavigation(item.id)} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                        {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                      </button>
                    </TooltipItem>
                  ))}
                </div>
              </div>
            )}

            {/* My Girls Section - Only for Operators and Senior Operators */}
            {(activeRole === 'Operator' || activeRole === 'Senior Operator') && !isSidebarCollapsed && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.15rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{capitalize(t('myAssignedGirls'))}</div>
                  
                  {/* ONLINE ONLY TOGGLE */}
                  <div 
                    onClick={() => setOnlineOnly(!onlineOnly)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: onlineOnly ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: onlineOnly ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}>
                      {t('onlineOnly')}
                    </span>
                    <div style={{ 
                      width: '16px', 
                      height: '10px', 
                      borderRadius: '10px', 
                      background: onlineOnly ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', 
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        background: 'white', 
                        borderRadius: '50%', 
                        position: 'absolute', 
                        top: '2px', 
                        left: onlineOnly ? '8px' : '2px',
                        transition: 'all 0.2s'
                      }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: '40vh', overflowY: 'auto' }} className="custom-scrollbar">
                  {(myProfiles || []).map(p => {
                    const isActive = activeProfile?.id === p.id;
                    return (
                      <button key={p.id} onMouseDown={() => { setActiveProfileId(p.id); setActiveTab('inbox'); }} onClick={() => { setActiveProfileId(p.id); setActiveTab('inbox'); }} style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.6rem 1.15rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent', border: 'none' }}>
                        <div style={{ width: '6px', height: '6px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                        <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'white' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* User Profile Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: (isSidebarCollapsed && !isMobile) ? '0' : '0 0.5rem', justifyContent: (isSidebarCollapsed && !isMobile) ? 'center' : 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '0.8rem', flexShrink: 0 }}>{displayAvatar}</div>
            {(!isSidebarCollapsed || isMobile) && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{displayName}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: '800' }}>{displayRoleString.toUpperCase()}</div>
              </div>
            )}
            {(!isSidebarCollapsed || isMobile) && <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error-color)', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={14} /></button>}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Sidebar;
