import React from 'react';
import { MessageSquare, X, MessageCircle } from 'lucide-react';

import { useNexus } from '../../context/ContextHook';

const NotificationSystem = () => {
  const nexus = useNexus();
  const { 
    toasts, notifications, notificationPanelOpen, setNotificationPanelOpen, 
    setNotifications, setToasts, activeOperator, t, isMobile, 
    isSimulating, setIsSimulating, handleNotificationClick, 
    markNotificationRead, hasNotificationTarget 
  } = nexus;
  
  const renderToasts = () => (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
      {(toasts || []).filter(n => {
        if (activeOperator?.isModel) {
          return n.profileId === activeOperator.profileId;
        }
        return true;
      }).map(n => {
        const isInteractive = hasNotificationTarget(n);
        return (
          <div key={n.id} className="glass-card fade-in" style={{
            padding: '1rem 1.5rem',
            background: 'rgba(5, 7, 10, 0.9)',
            borderColor: 'var(--accent-color)',
            borderLeft: '4px solid var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            minWidth: '280px',
            cursor: isInteractive ? 'pointer' : 'default'
          }}
            onClick={isInteractive ? () => handleNotificationClick(n) : undefined}
            onKeyDown={isInteractive ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleNotificationClick(n);
              }
            } : undefined}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <MessageCircle size={18} color="var(--accent-color)" />
              <div>
                {n.title && <div style={{ fontSize: '0.72rem', fontWeight: '900', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{n.title}</div>}
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{n.message || n.msg}</div>
                {isInteractive && <div style={{ fontSize: '0.68rem', color: 'var(--accent-color)', marginTop: '0.35rem', fontWeight: '800' }}>Tap to open chat</div>}
              </div>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setToasts(prev => prev.filter(t => t.id !== n.id));
              }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderNotificationPanel = () => {
    if (!notificationPanelOpen) return null;
    return (
      <>
        <div 
          onClick={() => setNotificationPanelOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1199 }}
        />
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: isMobile ? 'min(400px, 100vw)' : '400px', maxWidth: '100vw', background: 'rgba(5, 7, 10, 0.95)', borderLeft: '1px solid var(--card-border)', zIndex: 1200, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(30px)', animation: 'slideInRight 0.3s cubic-bezier(0, 0, 0.2, 1)' }}>
          <div style={{ padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 1.5rem) 1.5rem 1.5rem' : '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t('notifications')}</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>{t('clearAll')}</button>
              <button 
                onClick={() => setNotificationPanelOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? `1rem 1rem calc(env(safe-area-inset-bottom, 0px) + 1rem)` : '1rem' }} className="custom-scrollbar">
            {(() => {
              const filteredNotifications = (notifications || []).filter(n => {
                if (activeOperator?.isModel) {
                  return n.profileId === activeOperator.profileId;
                }
                return true;
              });

              if (filteredNotifications.length === 0) {
                return (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {t('noNotifications')}
                  </div>
                );
              }

              return (filteredNotifications || []).map(n => {
                const isInteractive = hasNotificationTarget(n);
                return (
                <div key={n.id} style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid var(--card-border)',
                  marginBottom: '1rem',
                  position: 'relative',
                  borderLeft: `4px solid ${
                    n.type === 'emergency' ? 'var(--_err-color)' :
                    n.type === 'success' ? 'var(--success-color)' :
                    n.type === 'warning' ? 'var(--warning-color)' : 'var(--accent-color)'
                  }`,
                  cursor: isInteractive ? 'pointer' : 'default'
                }}
                  onClick={isInteractive ? () => handleNotificationClick(n) : () => markNotificationRead(n.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (isInteractive) {
                        handleNotificationClick(n);
                      } else {
                        markNotificationRead(n.id);
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)' }}>{n.timestamp}</span>
                    {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }}></div>}
                  </div>
                  {n.title && <div style={{ fontSize: '0.72rem', fontWeight: '900', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{n.title}</div>}
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{n.message || n.msg}</div>
                  {isInteractive && <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: '800' }}>Open related chat</div>}
                </div>
              )});
            })()}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid var(--card-border)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800' }}>
                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)', animation: 'pulse 2s infinite' }}></div>
                 78.141.202.139:3001
               </div>
               <button 
                 onClick={() => setIsSimulating(!isSimulating)}
                 style={{ 
                   padding: '4px 10px', 
                   borderRadius: '6px', 
                   border: '1px solid var(--card-border)', 
                   background: isSimulating ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                   color: 'var(--accent-color)',
                   fontSize: '0.65rem',
                   fontWeight: '800',
                   cursor: 'pointer'
                 }}
               >
                 {isSimulating ? 'STOP SIMULATION' : 'START SIMULATION'}
               </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {renderToasts()}
      {renderNotificationPanel()}
    </>
  );
};

export default NotificationSystem;
