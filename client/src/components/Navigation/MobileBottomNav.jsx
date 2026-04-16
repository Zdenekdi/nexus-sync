import { LayoutDashboard, MessageSquare, Zap, Calendar } from 'lucide-react';
import { useNexus } from '../../context/NexusBaseContext';

const MobileBottomNav = () => {
  const nexus = useNexus();
  const { activeTab, setActiveTab, t, totalUnread, isAllowed } = nexus;
  const unreadCount = totalUnread || 0;
  
  const allTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: unreadCount, perm: 'messaging' },
    { id: 'relay', icon: Zap, label: t('relay'), perm: 'relay' },
    { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
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
        height: '70px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 5000,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            data-testid={`nav-mobile-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
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
    </div>
  );
};

export default MobileBottomNav;
