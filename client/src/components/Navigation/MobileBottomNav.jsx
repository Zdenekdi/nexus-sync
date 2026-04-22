import { LayoutDashboard, MessageSquare, Zap, Calendar } from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const MobileBottomNav = () => {
  const nexus = useNexus();
  const { activeTab, setActiveTab, setIsSidebarOpen, t, totalUnread, activeOperator, isAllowed } = nexus;
  const unreadCount = totalUnread || 0;

  // Custom SVG icons to bypass lucide-react bundling issues in production
  const DashboardIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
  const MessageIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
  const ZapIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
  const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  const allTabs = [
    { id: 'dashboard', icon: DashboardIcon, label: t('dashboard') },
    { id: 'inbox', icon: MessageIcon, label: t('messages'), badge: unreadCount, perm: 'messaging' },
    { id: 'relay', icon: ZapIcon, label: t('relay'), perm: 'relay' },
    { id: 'calendar', icon: CalendarIcon, label: t('schedule'), perm: 'calendar' },
  ];

  const tabs = allTabs.filter(tab => {
    // Explicitly hide sensitive tabs for pure admin roles on mobile as well
    const role = activeOperator;
    if (role?.isAppOwner || role?.isAdmin) {
      if (tab.id === 'calendar' || tab.id === 'relay') return false;
    }
    return !tab.perm || isAllowed(tab.perm);
  });

  return (
    <div 
      className="mobile-bottom-nav" 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: '70px',
        height: 'auto',
        background: '#080a0f',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
        zIndex: 5000,
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            data-testid={`nav-mobile-${tab.id}`}
            onClick={() => {
              setActiveTab(tab.id);
              setIsSidebarOpen(false);
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              padding: '12px 0',
              minHeight: '48px',
              color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            <div style={{ position: 'relative', marginBottom: '4px' }}>
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  filter: isActive ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'none',
                }}
              />
              {tab.badge > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-10px',
                  background: 'var(--error-color)',
                  color: 'white',
                  borderRadius: '10px',
                  minWidth: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid rgba(15, 23, 42, 0.9)'
                }}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </div>
              )}
            </div>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: isActive ? '800' : '500',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}>
              {tab.label}
            </span>
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                width: '60%',
                height: '3px',
                background: 'var(--accent-color)',
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 0 10px var(--accent-glow)'
              }} />
            )}
          </button>
        );
      })}
      <div style={{ position: 'absolute', bottom: '1px', right: '10px', fontSize: '0.45rem', opacity: 0.15, pointerEvents: 'none' }}>v3.21.1</div>
    </div>
  );
};

export default MobileBottomNav;
