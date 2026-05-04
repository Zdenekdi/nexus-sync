import React from 'react';
import { useNexus } from '../../context/ContextHook';
import { normalizeRole } from '../../utils/roleUtils';

const HierarchyView = () => {
  const nexus = useNexus() || {};
  const {
    isMobile = false,
    t = (k) => k,
    activeRole = '',
    activeOperator = null,
    operators = [],
    profiles = []
  } = nexus;

  // Role v hierarchii (Normalized to Uppercase)
  const roleHierarchy = ['Agency Admin', 'Manager', 'Senior Operator', 'Operator', 'Model'];

  // Filtrace operátorů
  const visibleOperators = (operators || []).filter(op => {
    const r = String(op.role || op.roleName || '').toUpperCase().trim();
    if (r === 'APP OWNER' || r === 'OWNER') return false; 
    return true; 
  });

  // Seskupení uživatelů podle rolí
  const groupedUsers = {};
  roleHierarchy.forEach(role => groupedUsers[role] = []);
  
  visibleOperators.forEach(op => {
    const normalizedRoleName = normalizeRole(op.role || op.roleName || '');
    // Match tier by normalized name
    const matchedTier = roleHierarchy.find(h => normalizeRole(h) === normalizedRoleName) || 'Operator';
    groupedUsers[matchedTier].push(op);
  });

  // Přidání profilů do sekce Model
  const existingModelOperatorProfileIds = new Set(
    groupedUsers['Model']?.map(op => op.profileId).filter(Boolean) || []
  );

  (profiles || []).forEach(profile => {
    if (!existingModelOperatorProfileIds.has(profile.id)) {
      groupedUsers['Model'].push({
        id: `profile-${profile.id}`,
        name: profile.name,
        role: 'Model',
        avatar: profile.name?.charAt(0) || 'M',
        isProfileOnly: true,
        metrics: { 
          revenue: profile.totalRevenue || 0, 
          bookings: profile.totalBookings || 0 
        }
      });
    }
  });

  const activeTiers = roleHierarchy.filter(role => groupedUsers[role].length > 0);

  return (
    <div data-testid="page-hierarchy-container" style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', flex: 1, overflowY: 'auto', maxHeight: '100%', position: 'relative' }} className="fade-in custom-scrollbar">
      <div style={{ marginBottom: isMobile ? '2rem' : '4rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('teamHierarchy') || 'Hierarchie týmu'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
          {t('teamHierarchyDesc') || 'Přehled struktury vaší agentury.'}
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '0rem',
        position: 'relative'
      }}>
        {activeTiers.map((tierName, index) => {
          const usersInTier = groupedUsers[tierName];
          const isModelTier = tierName === 'MODEL';

          return (
            <div key={tierName} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              position: 'relative', 
              width: '100%',
              marginTop: index === 0 ? '0' : '2.5rem'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em', 
                color: 'var(--text-secondary)', 
                fontWeight: '800', 
                marginBottom: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.4rem 1.2rem',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                {t(`roleLabels.${normalizeRole(tierName)}`) || tierName}
              </div>

              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: isMobile ? '1rem' : '2.5rem',
                width: '100%'
              }}>
                {usersInTier.map(user => (
                  <div key={user.id} style={{ position: 'relative' }}>
                    {/* Vertical line from top to card */}
                    <div style={{
                      position: 'absolute',
                      top: '-1.5rem',
                      left: '50%',
                      width: '2px',
                      height: '1.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      display: index === 0 ? 'none' : 'block'
                    }} />
                    
                    <div style={{
                      width: isMobile ? '140px' : '220px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '20px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'default',
                      position: 'relative',
                      backdropFilter: 'blur(10px)',
                      zIndex: 1
                    }} className="hierarchy-card">
                      <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: isModelTier ? 'linear-gradient(45deg, #ec4899, #8b5cf6)' : 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 'bold',
                        color: 'white',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.1)'
                      }}>
                        {user.avatar || user.name.charAt(0)}
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'white', marginBottom: '0.2rem' }}>{user.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                          {user.agencyId || 'Centrální Hub'}
                        </div>
                      </div>

                      {/* Zobrazujeme metriky pouze u modelek */}
                      {isModelTier && (
                        <div style={{ 
                          display: 'flex', 
                          gap: '0.5rem', 
                          marginTop: '0.5rem',
                          paddingTop: '0.8rem',
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                          width: '100%',
                          justifyContent: 'center'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>{user.metrics?.bookings || 0}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', opacity: 0.6 }}>Rezervace</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connector line to next tier */}
              {index < activeTiers.length - 1 && (
                <div style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  {/* Vertical line from tier to horizontal bar */}
                  <div style={{
                    width: '2px',
                    height: isMobile ? '1.5rem' : '2rem',
                    background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.2), rgba(255, 255, 255, 0.05))',
                  }} />
                  {/* Horizontal bridge bar */}
                  <div style={{
                    width: '80%',
                    maxWidth: '1200px',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '2px'
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HierarchyView;
