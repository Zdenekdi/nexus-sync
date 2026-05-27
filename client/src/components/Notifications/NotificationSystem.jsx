import React from 'react';
import { MessageSquare, X, MessageCircle } from 'lucide-react';

import { useNexus } from '../../context/ContextHook';

const NotificationSystem = () => {
  const nexus = useNexus();
  const { 
    toasts, 
    setToasts, 
    activeOperator, 
    t, 
    isMobile 
  } = nexus;

  // Safe fallbacks for missing properties in Context to prevent rendering crashes
  const notifications = nexus.notifications || [];
  const notificationPanelOpen = nexus.notificationPanelOpen || false;
  const setNotificationPanelOpen = nexus.setNotificationPanelOpen || (() => {});
  const setNotifications = nexus.setNotifications || (() => {});
  const isSimulating = nexus.isSimulating || false;
  const setIsSimulating = nexus.setIsSimulating || (() => {});
  const handleNotificationClick = nexus.handleNotificationClick || (() => {});
  const markNotificationRead = nexus.markNotificationRead || (() => {});
  const hasNotificationTarget = nexus.hasNotificationTarget || (() => false);
  
  const renderToasts = () => (
    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
      {(toasts || []).filter(n => {
        if (activeOperator?.isModel) {
          return n.profileId === activeOperator.profileId;
        }
        return true;
      }).map(n => {
        const isInteractive = hasNotificationTarget(n);
        
        // Dynamic styling based on notification type
        const typeColors = {
          emergency: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.4)', glow: 'rgba(239, 68, 68, 0.2)' },
          error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.4)', glow: 'rgba(239, 68, 68, 0.2)' },
          success: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.4)', glow: 'rgba(16, 185, 129, 0.2)' },
          warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.4)', glow: 'rgba(245, 158, 11, 0.2)' },
          info: { color: 'var(--accent-color)', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.4)', glow: 'rgba(59, 130, 246, 0.2)' }
        };
        const theme = typeColors[n.type] || typeColors.info;

        return (
          <div key={n.id} className="fade-in" style={{
            padding: '1.25rem 1.5rem',
            background: 'rgba(8, 10, 15, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.border}`,
            borderLeft: `4px solid ${theme.color}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${theme.glow}`,
            pointerEvents: 'auto',
            minWidth: '320px',
            maxWidth: '400px',
            cursor: isInteractive ? 'pointer' : 'default',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
            onClick={isInteractive ? () => handleNotificationClick(n) : undefined}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
              e.currentTarget.style.boxShadow = `0 15px 40px rgba(0,0,0,0.6), 0 0 30px ${theme.glow}`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${theme.glow}`;
            }}
            onKeyDown={isInteractive ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleNotificationClick(n);
              }
            } : undefined}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                background: theme.bg,
                padding: '0.6rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '-0.2rem'
              }}>
                <MessageCircle size={20} color={theme.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {n.title && <div style={{ fontSize: '0.75rem', fontWeight: '800', color: theme.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{n.title}</div>}
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc', lineHeight: '1.4' }}>{n.message || n.msg}</div>
                {isInteractive && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: theme.color, display: 'inline-block' }}></span>
                  Tap to view details
                </div>}
              </div>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setToasts(prev => prev.filter(t => t.id !== n.id));
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                alignSelf: 'flex-start'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
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
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: isMobile ? 'min(400px, 100vw)' : '420px', maxWidth: '100vw', background: 'rgba(8, 10, 15, 0.75)', borderLeft: '1px solid rgba(255,255,255,0.05)', zIndex: 1200, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 2rem) 2rem 1.5rem' : '2.5rem 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.02em', margin: 0, background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('notifications')}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '0.25rem' }}>Stay updated on your operations</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => setNotifications([])} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '10px', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
              >
                {t('clearAll')}
              </button>
              <button 
                onClick={() => setNotificationPanelOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? `1.5rem 1.5rem calc(env(safe-area-inset-bottom, 0px) + 1.5rem)` : '1.5rem 2rem' }} className="custom-scrollbar">
            {(() => {
              const filteredNotifications = (notifications || []).filter(n => {
                if (activeOperator?.isModel) {
                  return n.profileId === activeOperator.profileId;
                }
                return true;
              });

              if (filteredNotifications.length === 0) {
                return (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', gap: '1rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={24} color="rgba(255,255,255,0.2)" />
                    </div>
                    {t('noNotifications')}
                  </div>
                );
              }

              return (filteredNotifications || []).map(n => {
                const isInteractive = hasNotificationTarget(n);
                
                const typeColors = {
                  emergency: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)' },
                  error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)' },
                  success: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.2)' },
                  warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.2)' },
                  info: { color: 'var(--accent-color)', bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.2)' }
                };
                const theme = typeColors[n.type] || typeColors.info;

                return (
                <div key={n.id} style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  background: n.read ? 'rgba(255,255,255,0.02)' : theme.bg,
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : theme.border}`,
                  marginBottom: '1rem',
                  position: 'relative',
                  borderLeft: `4px solid ${theme.color}`,
                  cursor: isInteractive ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  opacity: n.read ? 0.7 : 1
                }}
                  onClick={isInteractive ? () => handleNotificationClick(n) : () => markNotificationRead(n.id)}
                  onMouseOver={(e) => {
                    if (isInteractive) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = n.read ? 'rgba(255,255,255,0.04)' : `rgba(${theme.color.match(/\w\w/g).map(x=>parseInt(x,16)).join(',')}, 0.1)`;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isInteractive) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = n.read ? 'rgba(255,255,255,0.02)' : theme.bg;
                    }
                  }}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ padding: '0.3rem', borderRadius: '8px', background: `rgba(${theme.color.match(/\w\w/g).map(x=>parseInt(x,16)).join(',')}, 0.15)` }}>
                         <MessageCircle size={14} color={theme.color} />
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)' }}>{n.timestamp}</span>
                    </div>
                    {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.color, boxShadow: `0 0 10px ${theme.color}` }}></div>}
                  </div>
                  {n.title && <div style={{ fontSize: '0.8rem', fontWeight: '900', color: theme.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{n.title}</div>}
                  <div style={{ fontSize: '0.95rem', fontWeight: '500', color: '#f8fafc', lineHeight: '1.5' }}>{n.message || n.msg}</div>
                  {isInteractive && <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: theme.color, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Open details
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>&rarr;</span>
                  </div>}
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
