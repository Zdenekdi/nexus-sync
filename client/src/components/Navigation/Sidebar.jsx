import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, MessageSquare, Calendar, Users, BarChart3, 
  Settings, Activity, Radio, Globe, Smartphone, FileSearch, 
  Shield, ShieldCheck, Building2, HardDrive, CreditCard, Zap, UserCheck,
  LogOut, Menu, X, Circle, Package as PackageIcon, Gift, Wallet,
  ChevronDown, ChevronRight, BookOpen
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

const SidebarSection = ({ id, label, isOpen, onToggle, children, isSidebarCollapsed }) => {
  if (isSidebarCollapsed) {
    return (
      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
        {children}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <button 
        onClick={() => onToggle(id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.5rem 1.15rem',
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.65rem',
          fontWeight: '950',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <div style={{ transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', opacity: 1, color: 'var(--accent-color)' }}>
          <ChevronDown size={16} />
        </div>
      </button>
      
      <div style={{ 
        maxHeight: isOpen ? '1000px' : '0',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isOpen ? 1 : 0,
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.2rem',
        marginTop: '0.2rem'
      }}>
        {children}
      </div>
    </div>
  );
};

// Group definitions
const groups = {
  overview: ['dashboard', 'analytics', 'activity', 'audit-logs'],
  operations: ['inbox', 'calendar', 'profiles', 'hierarchy', 'qa', 'web-profiles'],
  safety: ['safety', 'safety-guard'],
  management: ['inventory', 'referrals', 'payouts', 'crm'],
  system: ['device-setup', 'relay', 'settings'],
  global: ['agencies', 'infra', 'maintenance'],
  config: ['permissions', 'plans', 'features', 'docs']
};

const Sidebar = () => {
  const nexus = useNexus();
  const { 
    activeTab, setActiveTab, t, 
    activeOperator, logout, isMobile, 
    totalUnread,
    activeProfile, setActiveProfileId, activeRole, _profiles,
    isSidebarCollapsed, isAllowed,
    onlineOnly, setOnlineOnly,
    isSidebarOpen, setIsSidebarOpen
  } = nexus;

  // Use activeOperator.id for personalized persistence
  const storageKey = activeOperator?.id 
    ? `nexus_sidebar_sections_${activeOperator.id}` 
    : 'nexus_sidebar_sections_guest';

  const [sectionsOpen, setSectionsOpen] = useState(() => {
    const defaults = {
      myGirls: true,
      overview: true,
      operations: true,
      safety: true,
      management: true,
      system: true,
      global: true,
      config: true
    };
    try {
      // Direct access to localStorage for immediate non-flashing initialization
      const userId = activeOperator?.id;
      const key = userId ? `nexus_sidebar_sections_${userId}` : 'nexus_sidebar_sections_guest';
      const saved = localStorage.getItem(key);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (_err) {
      console.warn('Failed to load sidebar sections state');
    }
    return defaults;
  });


  const toggleSection = (id) => {
    setSectionsOpen(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (_err) {
        // Silently ignore storage errors
      }
      return newState;
    });
  };



  // Auto-expand section when tab changes
  useEffect(() => {
    if (!activeTab) return;
    
    let foundSectionId = null;
    for (const [sectionId, tabs] of Object.entries(groups)) {
      if (tabs.includes(activeTab)) {
        foundSectionId = sectionId;
        break;
      }
    }

    if (foundSectionId) {
      setTimeout(() => {
        setSectionsOpen(prev => {
          if (prev[foundSectionId]) return prev;
          const newState = { ...prev, [foundSectionId]: true };
          try {
            localStorage.setItem(storageKey, JSON.stringify(newState));
          } catch (_err) {
            // Ignore
          }
          return newState;
        });
      }, 0);
    }
  }, [activeTab, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const roleTranslations = {
    'Agency Admin': 'Administrátor',
    'AGENCY ADMIN': 'Administrátor',
    'Manager': 'Manažer',
    'MANAGER': 'Manažer',
    'Senior Operator': 'Senior Operátor',
    'SENIOR OPERATOR': 'Senior Operátor',
    'SENIOR OPERÁTOR': 'Senior Operátor',
    'Operator': 'Operátor',
    'OPERATOR': 'Operátor',
    'Model': 'Modelka',
    'MODEL': 'Modelka',
    'App Owner': 'Vlastník Aplikace',
    'APP OWNER': 'Vlastník Aplikace'
  };

  const displayRoleString = roleTranslations[activeOperator?.originalRole || activeRole] || (activeOperator?.originalRole || activeRole || '');
  const displayAvatar = activeOperator?.avatar || (displayName ? displayName.charAt(0) : '');

  if (isMobile && !isSidebarOpen) {
    return null;
  }

  const roleNameUpper = String(activeRole || '').toUpperCase().trim();
  const showMyGirls = 
    activeOperator?.isSeniorOperator || 
    activeOperator?.isOperator || 
    ['OPERATOR', 'SENIOR OPERATOR', 'SENIOR_OPERATOR', 'SENIOR OPERÁTOR', 'SENIOR_OPERÁTOR'].includes(roleNameUpper);

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
            <div onClick={() => { nexus.setActiveTab('dashboard'); nexus.setShowLanding(true); if(isMobile) setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}>
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

        {/* My Girls Section (Independent scroll, at the top) */}
        {showMyGirls && !isSidebarCollapsed && (
          <SidebarSection 
            id="myGirls" 
            label={t('myAssignedGirls')} 
            isOpen={sectionsOpen.myGirls} 
            onToggle={toggleSection} 
            isSidebarCollapsed={isSidebarCollapsed}
          >
            <div data-testid="my-girls-section" style={{ 
              padding: '0 0.5rem', 
              marginBottom: '1rem', 
              display: 'flex', 
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0.65rem', marginBottom: '0.75rem' }}>
                <div 
                    onClick={() => setOnlineOnly(!onlineOnly)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      cursor: 'pointer',
                      background: onlineOnly ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      border: onlineOnly ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', background: onlineOnly ? 'var(--success-color)' : 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: onlineOnly ? 'var(--success-color)' : 'rgba(255,255,255,0.4)' }}>ONLINE</span>
                  </div>
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.2rem',
                maxHeight: '25vh',
                overflowY: 'auto',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                padding: '0.5rem',
                border: '1px solid rgba(255,255,255,0.05)'
              }} className="custom-scrollbar">
                {(!myProfiles || myProfiles.length === 0) ? (
                  <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>{t('noAssignedGirls')}</div>
                ) : (
                  <>
                    {myProfiles.filter(p => !onlineOnly || p.status === 'online').map(p => {
                      const isActive = activeProfile?.id === p.id;
                      return (
                        <button key={p.id} onClick={() => { setActiveProfileId(p.id); setActiveTab('inbox'); if(isMobile) setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.6rem 0.65rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none' }}>
                          <div style={{ width: '6px', height: '6px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                          <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'white' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </SidebarSection>
        )}

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }} className="custom-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeOperator?.isAppOwner ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0rem' }}>
                  <SidebarSection id="global" label={t('navSections.globalManagement')} isOpen={sectionsOpen.global} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                    {[
                      { id: 'agencies', icon: Building2, label: t('agencies') },
                      { id: 'infra', icon: Activity, label: t('infra') },
                      { id: 'maintenance', icon: HardDrive, label: t('maintenance') },
                    ].map(item => (
                      <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                        <button data-testid={`nav-link-${item.id}`} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                          <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                          {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                        </button>
                      </TooltipItem>
                    ))}
                  </SidebarSection>

                  <SidebarSection id="config" label={t('navSections.systemConfiguration')} isOpen={sectionsOpen.config} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                    {[
                      { id: 'permissions', icon: Shield, label: t('permissions') },
                      { id: 'plans', icon: CreditCard, label: t('plansManagement') },
                      { id: 'features', icon: Zap, label: t('features') },
                      { id: 'docs', icon: FileSearch, label: t('documentation') },
                    ].map(item => (
                      <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                        <button data-testid={`nav-link-${item.id}`} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                          <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                          {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                        </button>
                      </TooltipItem>
                    ))}
                  </SidebarSection>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0rem' }}>
                    <SidebarSection id="overview" label={t('navSections.overview')} isOpen={sectionsOpen.overview} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                      {[
                        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
                        { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                        { id: 'activity', icon: Activity, label: t('activity'), perm: 'analytics' },
                        { id: 'audit-logs', icon: FileSearch, label: t('auditLogs'), perm: 'audit_logs' },
                      ].filter(item => !item.perm || isAllowed(item.perm)).map(item => (
                        <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                          <button onClick={() => handleNavigation(item.id)} data-testid={`nav-link-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                            <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                            {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                          </button>
                        </TooltipItem>
                      ))}
                    </SidebarSection>

                    <SidebarSection id="operations" label={t('navSections.operations')} isOpen={sectionsOpen.operations} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                      {[
                        { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: totalUnread, perm: 'messaging' },
                        { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                        { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                        { id: 'hierarchy', icon: Users, label: t('hierarchy'), perm: 'hierarchy' },
                        { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
                        { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                      ].filter(item => !item.perm || isAllowed(item.perm)).map(item => (
                        <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                          <button onClick={() => handleNavigation(item.id)} data-testid={`nav-link-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                            <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                            {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                          </button>
                        </TooltipItem>
                      ))}
                    </SidebarSection>

                    <SidebarSection id="safety" label={t('navSections.safety')} isOpen={sectionsOpen.safety} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                      {[
                        { id: 'safety', icon: ShieldCheck, label: t('safety'), perm: 'safety' },
                        { id: 'safety-guard', icon: Activity, label: t('safetyGuard'), perm: 'safety' },
                      ].filter(item => !item.perm || isAllowed(item.perm)).map(item => (
                        <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                          <button onClick={() => handleNavigation(item.id)} data-testid={`nav-link-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                            <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                            {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                          </button>
                        </TooltipItem>
                      ))}
                    </SidebarSection>

                    <SidebarSection id="management" label={t('navSections.management')} isOpen={sectionsOpen.management} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                      {[
                        { id: 'inventory', icon: PackageIcon, label: t('inventory'), perm: 'inventory' },
                        { id: 'referrals', icon: Gift, label: t('referrals'), perm: 'messaging' },
                        { id: 'payouts', icon: Wallet, label: t('payouts'), perm: 'analytics' },
                        { id: 'crm', icon: UserCheck, label: t('crm'), perm: 'analytics' },
                      ].filter(item => !item.perm || isAllowed(item.perm)).map(item => (
                        <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                          <button onClick={() => handleNavigation(item.id)} data-testid={`nav-link-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                            <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                            {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                          </button>
                        </TooltipItem>
                      ))}
                    </SidebarSection>

                    <SidebarSection id="system" label={t('navSections.system')} isOpen={sectionsOpen.system} onToggle={toggleSection} isSidebarCollapsed={isSidebarCollapsed}>
                      {[
                        { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
                        { id: 'relay', icon: Radio, label: t('relay'), perm: 'relay' },
                        { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
                      ].filter(item => !item.perm || isAllowed(item.perm)).map(item => (
                        <TooltipItem key={item.id} label={capitalize(item.label)} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed}>
                          <button onClick={() => handleNavigation(item.id)} data-testid={`nav-link-${item.id}`} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                            <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                            {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '0.95rem' }}>{capitalize(item.label)}</span>}
                          </button>
                        </TooltipItem>
                      ))}
                    </SidebarSection>
                </div>
            )}

            {/* Section removed from here */}
          </div>
        </div>
        
        {/* User Profile Footer (Zero Skeletons) */}
        <div style={{ marginTop: '0', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
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
