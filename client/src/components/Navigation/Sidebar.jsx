import React, { useState } from 'react';
import { 
  LayoutDashboard, MessageSquare, Calendar, Users, BarChart3, 
  Settings, Activity, Radio, Globe, Smartphone, FileSearch, 
  Shield, Building2, HardDrive, CreditCard, Zap, Package, 
  Bell, LogOut, ChevronDown, ChevronUp, Copy, Menu, X
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const Sidebar = () => {
  const nexus = useNexus();
  const { 
    activeTab, setActiveTab, t, lang, setLang, 
    activeOperator, logout, isMobile, 
    totalUnread, getUnreadForProfile, myProfiles,
    activeProfile, setActiveProfileId, isNativeApp, activeRole,
    isSidebarCollapsed, setIsSidebarCollapsed, isAllowed
  } = nexus;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState({
    operations: true,
    agency: true,
    infrastructure: true
  });
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  const toggleUnit = (unit) => {
    setExpandedUnits(prev => ({ ...prev, [unit]: !prev[unit] }));
  };

  const handleNavigation = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const handleMobileProfileClick = (p) => {
    setActiveProfileId(p.id);
    setActiveTab('inbox');
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  // MOBILE OVERLAY
  if (isMobile && !isMobileMenuOpen) {
    return (
      <div style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 1000, display: 'flex', gap: '0.75rem' }}>
        <button onClick={() => setIsMobileMenuOpen(true)} className="glass-card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid var(--card-border)' }}>
          <Menu size={20} />
        </button>
      </div>
    );
  }

  return (
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
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src="/nexus_icon.png" alt="Nexus" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white' }}>Nexus Hub</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
                { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeRole === 'Model' ? 0 : totalUnread, perm: 'messaging' },
                { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub', hideForOwner: true },
                { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' }
              ].filter(item => {
                if (item.hideForOwner && activeRole === 'App Owner') return false;
                if (activeRole === 'Model' && item.id === 'qa') return false;
                return !item.perm || isAllowed(item.perm);
              }).map(item => (
                <button key={item.id} onClick={() => handleNavigation(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.15rem', borderRadius: '18px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)', border: activeTab === item.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent', color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.6)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
                  <item.icon size={22} color={activeTab === item.id ? 'var(--accent-color)' : 'currentColor'} />
                  <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{capitalize(item.label)}</span>
                  {item.badge > 0 && <div style={{ marginLeft: 'auto', background: 'var(--accent-color)', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', fontWeight: '900' }}>{item.badge}</div>}
                </button>
              ))}
            </div>
            {/* PRIVACY FIX: Hide assigned girls from Models */}
            {activeRole !== 'Model' && activeRole !== 'App Owner' && !activeOperator?.isAdmin && (myProfiles || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{capitalize(t('myAssignedGirls'))}</div>
                  <div onClick={() => setShowOnlyOnline(!showOnlyOnline)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}></div>
                    <span style={{ fontSize: '0.62rem', fontWeight: '900', color: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.3)' }}>ONLINE</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(myProfiles || []).filter(p => !showOnlyOnline || p.status === 'online').slice(0, 10).map(p => {
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <button onClick={() => handleNavigation('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === 'dashboard' ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                  <LayoutDashboard size={20} color={activeTab === 'dashboard' ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                  {!isSidebarCollapsed && <span style={{ color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'dashboard' ? '800' : '600', fontSize: '1rem' }}>{capitalize(t('dashboard'))}</span>}
                </button>
              </div>

              {activeRole !== 'App Owner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {!isSidebarCollapsed && (
                    <button onClick={() => toggleUnit('operations')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.15rem', marginBottom: '0.6rem', background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '950', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{capitalize(t('operationsUnit'))}</span>
                      {expandedUnits.operations ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
                    </button>
                  )}
                  {(isSidebarCollapsed || expandedUnits.operations) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {[
                        { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeRole === 'Model' ? 0 : totalUnread, perm: 'messaging' },
                        { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                        { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                        { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                        { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup', hideForOwner: true },
                        { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub', hideForOwner: true },
                      ].filter(item => {
                        const hasPerm = !item.perm || isAllowed(item.perm);
                        if (!hasPerm) return false;
                        if (item.hideForOwner && activeRole === 'App Owner') return false;
                        if (activeRole === 'Model' && (item.id === 'profiles' || item.id === 'web-profiles' || item.id === 'qa')) return false;
                        return true;
                      }).map(item => (
                        <button key={item.id} onClick={() => handleNavigation(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.75rem 1.15rem', borderRadius: '12px', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                          <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                          {!isSidebarCollapsed && <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '800' : '600', fontSize: '1rem' }}>{capitalize(item.label)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRIVACY FIX: Strictly hidden for Models */}
            {activeRole !== 'Model' && activeRole !== 'App Owner' && !activeOperator?.isAdmin && !isSidebarCollapsed && (myProfiles || []).length > 0 && (
              <div style={{ marginTop: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.85rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{capitalize(t('myAssignedGirls'))}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '35vh', overflowY: 'auto' }} className="custom-scrollbar">
                  {(myProfiles || []).map(p => {
                    const isActive = activeProfile?.id === p.id;
                    return (
                      <button key={p.id} onClick={() => { setActiveProfileId(p.id); setActiveTab('inbox'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 0.85rem', border: '1px solid', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)', borderColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent' }}>
                        <div style={{ width: '8px', height: '8px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.88rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'white' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: isSidebarCollapsed ? '0' : '0 0.5rem', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '0.85rem', flexShrink: 0 }}>{activeOperator?.avatar}</div>
              {!isSidebarCollapsed && <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.88rem', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{activeOperator?.name}</div><div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800' }}>{activeRole?.toUpperCase() || ''}</div></div>}
              {!isSidebarCollapsed && <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error-color)', width: '30px', height: '30px', borderRadius: '10px', cursor: 'pointer' }}><LogOut size={16} /></button>}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Sidebar;
