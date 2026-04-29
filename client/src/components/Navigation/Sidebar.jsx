import React from 'react';
import { 
  LayoutDashboard, MessageSquare, Calendar, Users, BarChart3, 
  Settings, Activity, Radio, Globe, Smartphone, FileSearch, 
  Shield, Building2, HardDrive, CreditCard, Zap, UserCheck,
  LogOut, Menu, X, Circle, Package as PackageIcon, Gift, Wallet
} from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const TooltipItem = ({ label, children, isMobile, isSidebarCollapsed }) => {
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

const Sidebar = () => {
  const nexus = useNexus();
  const { 
    activeTab, setActiveTab, t, 
    activeOperator, logout, isMobile, 
    totalUnread,
    activeProfile, setActiveProfileId, activeRole,
    isSidebarCollapsed, isAllowed,
    onlineOnly, setOnlineOnly,
    isSidebarOpen, setIsSidebarOpen
  } = nexus;

  const handleNavigation = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    if (isMobile) setIsSidebarOpen(false);
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  // Use the globally filtered profiles from context for consistency
  const myProfiles = nexus.myProfiles || [];

  const displayName = activeOperator?.name || '';
  const displayRoleString = activeOperator?.originalRole || activeRole || '';
  const displayAvatar = activeOperator?.avatar || (displayName ? displayName.charAt(0) : '');

  if (isMobile && !isSidebarOpen) {
    return null;
  }


  return (
    <>
    <style>{`
      .sidebar-tooltip-wrap { pointer-events: none; }
      .sidebar-tooltip-wrap > * { pointer-events: auto; }
      .sidebar-tooltip-wrap .sidebar-tooltip-text {
        display: none; position: absolute; left: calc(100% + 8px); top: 50%; transform: translateY(-50%);
        background: rgba(15,23,42,0.95); color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem;
        font-weight: 700; white-space: nowrap; pointer-events: none; z-index: 9999; border: 1px solid rgba(255,255,255,0.1);
      }
      .sidebar-tooltip-wrap:hover .sidebar-tooltip-text { display: block; }
      @keyframes relay-pulse {
        0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      .relay-pulse { animation: relay-pulse 2s infinite; }
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
      top: 0, left: 0, zIndex: 4000,
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: isMobile ? '0' : '0' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: (isMobile || !isSidebarCollapsed) ? 'space-between' : 'center', width: '100%' }}>
            <div onClick={() => { setActiveTab('dashboard'); if(isMobile) setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}>
              <div style={{ width: isSidebarCollapsed ? '42px' : '48px', height: isSidebarCollapsed ? '42px' : '48px', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative' }}>
                <img src="/nexus_icon.png" alt="Nexus Hub" style={{ width: '100%', height: '100%', borderRadius: '12px', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }} />
                <div style={{
                  position: 'absolute', bottom: '-2px', right: '-2px', background: (nexus.sessions?.length > 0) ? '#10b981' : '#64748b',
                  padding: '2px 6px', borderRadius: '10px', border: '2px solid #0a0c10', boxShadow: (nexus.sessions?.length > 0) ? '0 0 10px #10b981' : 'none',
                  fontSize: '0.6rem', fontWeight: '900', color: 'white', display: isSidebarCollapsed ? 'none' : 'block'
                }}>
                  LIVE
                </div>
              </div>
              
              {!isSidebarCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'white', fontWeight: '900', fontSize: '1.15rem', letterSpacing: '0.05em', lineHeight: 1 }}>NEXUS HUB</span>
                  <span style={{ color: 'var(--accent-color)', fontWeight: '800', fontSize: '0.65rem', letterSpacing: '0.2em', marginTop: '4px' }}>PREMIUM SYNC</span>
                </div>
              )}
            </div>

            {isMobile && (
              <button 
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }} className="custom-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TooltipItem label={capitalize(t('dashboard'))} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
              <button data-testid="nav-link-dashboard" onClick={() => handleNavigation('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === 'dashboard' ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                <LayoutDashboard size={20} color={activeTab === 'dashboard' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                {!isSidebarCollapsed && <span style={{ color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'dashboard' ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(t('dashboard'))}</span>}
              </button>
            </TooltipItem>

            {/* Role-based Links */}
            {activeOperator?.isAppOwner ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                  {[
                    { id: 'agencies', icon: Building2, label: t('agencies') },
                    { id: 'infra', icon: Activity, label: t('infrastructure') },
                    { id: 'maintenance', icon: HardDrive, label: t('maintenance') },
                    { id: 'permissions', icon: Shield, label: t('permissions') },
                    { id: 'plans', icon: CreditCard, label: t('plansManagement') },
                    { id: 'features', icon: Zap, label: t('features') },
                    { id: 'docs', icon: FileSearch, label: 'Documentation' },
                  ].map(item => (
                    <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                      <button data-testid={`nav-link-${item.id}`} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                        {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                      </button>
                    </TooltipItem>
                  ))}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                    {[
                      { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: totalUnread, perm: 'messaging' },
                      { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                      { id: 'safety', icon: Shield, label: t('safety'), perm: 'safety' },
                      { id: 'safety-guard', icon: Shield, label: t('safetyGuard') || 'Safety Guard', perm: 'safety' },
                      { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                      { id: 'inventory', icon: PackageIcon, label: t('inventory') || 'Sklad', perm: 'inventory' },
                      { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                      { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
                      { id: 'relay', icon: Radio, label: t('relay'), perm: 'relay' },
                      { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
                      { id: 'hierarchy', icon: Users, label: t('hierarchy'), perm: 'hierarchy' },
                      { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                      { id: 'crm', icon: UserCheck, label: t('crm') || 'CRM', perm: 'analytics' },
                      { id: 'activity', icon: Activity, label: t('activity'), perm: 'analytics' },
                      { id: 'referrals', icon: Gift, label: t('referrals') || 'Partner Program', perm: 'messaging' },
                      { id: 'audit-logs', icon: FileSearch, label: t('auditLogs') || 'Auditní Logy', perm: 'audit_logs' },
                      { id: 'payouts', icon: Wallet, label: t('payouts') || 'Výplaty', perm: 'analytics' },
                      { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
                    ].filter(item => !item.perm || isAllowed(item.perm)).map(item => (
                      <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                        <button onClick={() => handleNavigation(item.id)} data-testid={`nav-link-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                          <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                          {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                        </button>
                      </TooltipItem>
                    ))}
                </div>
            )}

            {/* My Girls Section */}
            {['Operator', 'Senior Operator'].includes(activeRole) && !isSidebarCollapsed && (
              <div data-testid="my-girls-section" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.15rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{capitalize(t('myAssignedGirls'))}</div>
                  <div onClick={() => setOnlineOnly(!onlineOnly)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', background: onlineOnly ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${onlineOnly ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: onlineOnly ? 'var(--success-color)' : 'rgba(255,255,255,0.4)' }}>{t('onlineOnly')}</span>
                    <div style={{ width: '28px', height: '16px', borderRadius: '12px', background: onlineOnly ? 'var(--success-color)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                      <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: onlineOnly ? '14px' : '2px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: isMobile ? 'none' : '40vh', overflowY: isMobile ? 'visible' : 'auto' }} className="sidebar-scroll-container">
                  {(!myProfiles || myProfiles.length === 0) ? (
                    <div style={{ padding: '0.5rem 1.15rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>{t('noAssignedGirls')}</div>
                  ) : (
                    <>
                      {myProfiles.map(p => {
                        const isActive = activeProfile?.id === p.id;
                        return (
                          <button key={p.id} onClick={() => { setActiveProfileId(p.id); setActiveTab('inbox'); if(isMobile) setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.6rem 1.15rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent', border: 'none' }}>
                            <div style={{ width: '6px', height: '6px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                            <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'white' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          </button>
                        );
                      })}
                      {isMobile && <div key="scroll-spacer" style={{ height: '120px', flexShrink: 0 }} aria-hidden="true" />}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* User Profile Footer (Zero Skeletons) */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: (isSidebarCollapsed && !isMobile) ? '0' : '0 0.5rem', justifyContent: (isSidebarCollapsed && !isMobile) ? 'center' : 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '0.8rem', flexShrink: 0 }}>{displayAvatar}</div>
            {(!isSidebarCollapsed || isMobile) && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{displayName}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: '800' }}>{displayRoleString.toUpperCase()}</div>
              </div>
            )}
            {(!isSidebarCollapsed || isMobile) && <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--_err-color)', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={14} /></button>}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Sidebar;
