import React from 'react';

const HierarchyView = ({
  isMobile,
  t,
  activeRole,
  activeOperator,
  operators,
  profiles,
  agencies
}) => {
  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('teamHierarchy')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>{t('teamHierarchyDesc')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {operators.filter(op => {
          if (activeRole === 'App Owner') return true;
          return op.agencyId === activeOperator?.agencyId;
        }).map(op => {
          const assignedModels = profiles.filter(p => (p.operators || p.assignees || []).some(o => o.id === op.id || o === op.id));
          const agency = agencies.find(a => a.id === op.agencyId);
          return (
            <div key={op.id} className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: isMobile ? '48px' : '60px', height: isMobile ? '48px' : '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                    {op.avatar}
                  </div>
                  <div>
                    <h3 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800' }}>
                      {op.name}
                      {activeRole === 'App Owner' && agency && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '400', marginLeft: '0.5rem' }}>
                          ({agency.name})
                        </span>
                      )}
                    </h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{op.role === 'Night Shift' ? t('nightShift') : op.role} • {assignedModels.length} {t('assignedModels')}</div>
                  </div>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto', paddingTop: isMobile ? '1rem' : 0, borderTop: isMobile ? '1px solid var(--card-border)' : 'none' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>{t('todaysPerformance')}</div>
                  <div style={{ display: 'flex', gap: '2.5rem' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{op.metrics?.messages || 0}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('messages').toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{op.metrics?.conversion || '0%'}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('conversion') || 'CONV.').toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {assignedModels.map(model => (
                  <div key={model.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', background: 'var(--accent-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '0.75rem' }}>
                      {model.username?.substring(0,2).toUpperCase() || model.name.substring(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{model.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: model.status === 'online' ? 'var(--success-color)' : 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{(t(model.status) || 'OFFLINE').toString().toUpperCase()}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{model.unreadCount || 0}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{(t('unread') || 'UNREAD').toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HierarchyView;
