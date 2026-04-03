import React from 'react';
import { 
  X, LayoutDashboard, MessageSquare, Calendar, BarChart3, Users, Building2, HardDrive, 
  Settings, Radio, Bell, LogOut, ChevronUp, ChevronDown, Package, Globe, Smartphone, 
  Activity, FileSearch, Shield, CreditCard, Zap, Copy
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const Sidebar = () => {
  const nexus = useNexus();
  const { 
    activeOperator, activeRole, activeTab, totalUnread, rolePermissions,
    myProfiles, showOnlyOnline, lang, isSidebarCollapsed, isMobileMenuOpen,
    isToolsExpanded, activeProfile, getUnreadForProfile, messages,
    setIsMobileMenuOpen, handleNavigation, setShowOnlyOnline, setIsRelayMode,
    setNotificationPanelOpen, handleLogout, setIsToolsExpanded, setActiveProfileId,
    setSelectedChatId, setMobileView, setLang, setIsSidebarCollapsed, setActiveTab, t, isMobile, isAllowed, isNativeApp 
  } = nexus;

  const handleMobileProfileClick = (p) => {
    setActiveProfileId(p.id);
    setActiveTab('inbox');
    const firstUnread = messages.find(m => m.profileId === p.id && m.status === 'unread');
    if (firstUnread) {
      setSelectedChatId(firstUnread.id);
      setMobileView('chat');
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`desktop-sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
      width: isMobile ? '100vw' : (isSidebarCollapsed ? '80px' : '280px'),
      flexShrink: 0,
      borderRight: isMobile ? 'none' : '1px solid var(--card-border)',
      padding: isMobile ? '0' : (isSidebarCollapsed ? '1.5rem 0.75rem' : '2.5rem 1.25rem'),
      background: isMobile ? 'rgba(7, 10, 15, 0.98)' : 'rgba(7, 10, 15, 0.7)',
      backdropFilter: isMobile ? 'blur(20px)' : 'blur(40px)',
      display: 'flex',
      flexDirection: 'column',
      position: isMobile ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      height: '100dvh',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 10000,
      overflow: 'hidden'
    }}>
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: 'max(env(safe-area-inset-top), 2rem) 1.5rem calc(max(env(safe-area-inset-bottom), 0px) + 3.25rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}>{activeOperator?.avatar}</div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white' }}>{activeOperator?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.05em' }}>{activeRole?.toUpperCase() || ''}</div>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }} className="custom-scrollbar">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
                { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: totalUnread },
                { id: 'calendar', icon: Calendar, label: t('schedule') },
                { id: 'relay', icon: Radio, label: lang === 'cz' ? 'Relay System' : 'Relay System' }, // Our New Tab
                { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
                { id: 'infra', icon: HardDrive, label: t('infra'), perm: 'infrastructure' },
                { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
              ].filter(item => !item.perm || (rolePermissions[activeRole] || {})[item.perm]).map(item => (
                <button key={item.id} onClick={() => handleNavigation(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem 1rem', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)', border: activeTab === item.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                  <item.icon size={26} color={activeTab === item.id ? 'var(--accent-color)' : 'rgba(255,255,255,0.6)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{item.label}</span>
                  {item.badge > 0 && <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--error-color)', color: 'white', fontSize: '0.6rem', minWidth: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' }}>{item.badge}</div>}
                </button>
              ))}
            </div>
            {activeRole !== 'Model' && activeRole !== 'App Owner' && !activeOperator?.isAdmin && myProfiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{t('myAssignedGirls').toUpperCase()}</div>
                  <div onClick={() => setShowOnlyOnline(!showOnlyOnline)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}></div>
                    <span style={{ fontSize: '0.62rem', fontWeight: '900', color: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.3)' }}>ONLINE</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {myProfiles.filter(p => !showOnlyOnline || p.status === 'online').slice(0, 10).map(p => {
                    const unread = getUnreadForProfile(p.id);
                    return (
                      <button key={p.id} onClick={() => handleMobileProfileClick(p)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', width: '100%', textAlign: 'left' }}>
                        <div style={{ width: '8px', height: '8px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>{p.name}</span>
                        {unread > 0 && <div style={{ background: 'var(--error-color)', color: 'white', fontSize: '0.6rem', minWidth: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' }}>{unread}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setNotificationPanelOpen(true); setIsMobileMenuOpen(false); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}><Bell size={18} /> {t('notifications') || 'Alerts'}</button>
            <button onClick={handleLogout} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '15px', color: 'var(--error-color)', fontWeight: '800', fontSize: '0.9rem' }}><LogOut size={18} /> {t('logout') || 'Exit'}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', width: '100%', marginBottom: isSidebarCollapsed ? '1.5rem' : '0.5rem' }}>
              <div onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}>
                <div style={{ width: isSidebarCollapsed ? '42px' : '48px', height: isSidebarCollapsed ? '42px' : '48px', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative' }}>
                  <img src="/nexus_icon.png" alt="Nexus Hub" style={{ width: '100%', height: '100%', borderRadius: '12px', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }} />
                </div>
                {!isSidebarCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Nexus Hub</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: '800', letterSpacing: '0.15em', marginTop: '0.15rem' }}>PREMIUM SYNC</span>
                  </div>
                )}
              </div>
            </div>
            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '3px', borderRadius: '12px', border: '1px solid var(--card-border)', gap: '0.5rem' }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '9px', flex: 1 }}>
                  <button onClick={() => setLang('cz')} style={{ flex: 1, padding: '5px 0', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '7px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>CZ</button>
                  <button onClick={() => setLang('en')} style={{ flex: 1, padding: '5px 0', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '7px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
                </div>
                <button onClick={() => setNotificationPanelOpen(true)} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={16} /></button>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', marginRight: '-0.75rem', paddingRight: '0.75rem' }} className="custom-scrollbar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* UNIT: OPERATIONS */}
              <div>
                {!isSidebarCollapsed && <div style={{ fontSize: '0.8rem', fontWeight: '950', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', padding: '0 1.15rem', marginBottom: '0.6rem' }}>{t('operationsUnit') || 'OPERATIVA'}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {[
                    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
                    { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeOperator?.isModel ? 0 : totalUnread, perm: 'messaging' },
                    { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                    { id: 'relay', icon: Radio, label: 'Relay System', nativeOnly: true },
                    { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                    { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                    { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
                    { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
                    { id: 'referrals', icon: Copy, label: t('referralProgram') || 'Referrals', perm: 'referrals', hideForOwner: true },
                  ].filter(item => {
                    if (item.nativeOnly && !isNativeApp) return false;
                    if (item.hideForOwner && activeRole === 'App Owner') return false;
                    return !item.perm || isAllowed(item.perm);
                  }).map(item => (
                    <button key={item.id} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                      <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                      {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '1rem' }}>{item.label}</span>}
                      {item.badge > 0 && !isSidebarCollapsed && <div style={{ marginLeft: 'auto', background: 'var(--accent-color)', color: 'white', fontSize: '0.62rem', padding: '1px 7px', borderRadius: '20px', fontWeight: '950' }}>{item.badge}</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* UNIT: AGENCY */}
              {(isAllowed('analytics') || isAllowed('hierarchy') || isAllowed('audit_logs') || isAllowed('settings')) && (
                <div>
                  {!isSidebarCollapsed && <div style={{ fontSize: '0.8rem', fontWeight: '950', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', padding: '0 1.15rem', marginBottom: '0.6rem', marginTop: '0.85rem' }}>{t('agencyUnit') || 'SPRÁVA AGENTURY'}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {[
                      { id: 'hierarchy', icon: Users, label: t('teamHierarchy'), perm: 'hierarchy', hideForOwner: true },
                      { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                      { id: 'activity', icon: Activity, label: t('auditLog'), perm: 'audit_logs' },
                      { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
                    ].filter(item => {
                      if (item.hideForOwner && activeRole === 'App Owner') return false;
                      return isAllowed(item.perm);
                    }).map(item => (
                      <button key={item.id} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <item.icon size={19} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                        {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '500', fontSize: '0.9rem' }}>{item.label}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* UNIT: INFRASTRUCTURE */}
              {(isAllowed('agencies') || isAllowed('infrastructure') || isAllowed('permissions') || isAllowed('plans') || isAllowed('global_features')) && (
                <div>
                  {!isSidebarCollapsed && <div style={{ fontSize: '0.8rem', fontWeight: '950', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', padding: '0 1.15rem', marginBottom: '0.6rem', marginTop: '0.85rem' }}>{t('infraUnit') || 'INFRASTRUKTURA A ŘÍZENÍ'}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {[
                      { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
                      { id: 'infra', icon: HardDrive, label: t('infra'), perm: 'infrastructure' },
                      { id: 'permissions', icon: Shield, label: t('permissions'), perm: 'permissions' },
                      { id: 'plans', icon: CreditCard, label: t('plans'), perm: 'plans' },
                      { id: 'features', icon: Zap, label: t('features'), perm: 'global_features' },
                      { id: 'inventory', icon: Package, label: t('stockCard') || 'Sklad', perm: 'inventory' },
                    ].filter(item => isAllowed(item.perm)).map(item => (
                      <button key={item.id} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                        <item.icon size={19} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                        {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '500', fontSize: '0.9rem' }}>{item.label}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!activeOperator?.isModel && activeRole !== 'App Owner' && !activeOperator?.isAdmin && !isSidebarCollapsed && (
              <div style={{ marginTop: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.85rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{t('myAssignedGirls').toUpperCase()}</div>
                  <div onClick={() => setShowOnlyOnline(!showOnlyOnline)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}></div>
                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.3)' }}>ONLINE</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '35vh', overflowY: 'auto' }} className="custom-scrollbar">
                  {(myProfiles || []).filter(p => !showOnlyOnline || p.status === 'online').map(p => {
                    const unread = getUnreadForProfile(p.id);
                    const isActive = activeProfile?.id === p.id;
                    return (
                      <button key={p.id} onClick={() => { setActiveProfileId(p.id); setActiveTab('inbox'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 0.85rem', border: '1px solid', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)', borderColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent' }}>
                        <div style={{ width: '8px', height: '8px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%', flexShrink: 0 }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.88rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'white' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div></div>
                        {unread > 0 && <div style={{ background: 'var(--error-color)', color: 'white', fontSize: '0.62rem', minWidth: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' }}>{unread}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: isSidebarCollapsed ? '0' : '0 0.5rem', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 6px 15px rgba(0,0,0,0.4)' }}>{activeOperator?.avatar}</div>
              {!isSidebarCollapsed && <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.88rem', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{activeOperator?.name}</div><div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.05em' }}>{activeRole?.toUpperCase() || ''}</div></div>}
              {!isSidebarCollapsed && <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error-color)', width: '30px', height: '30px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={16} /></button>}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Sidebar;
