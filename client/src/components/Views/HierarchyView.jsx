import React from 'react';
import { useNexus } from '../../context/ContextHook';

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

  // Define the role hierarchy order (omitted App Owner to keep it agency-specific)
  const roleHierarchy = ['Agency Admin', 'Manager', 'Senior Operator', 'Operator', 'Model'];

  // Filter operators based on view access
  const visibleOperators = (operators || []).filter(op => {
    if (op.role === 'App Owner') return false; // Explicitly hide App Owner from hierarchy diagram
    if (activeRole === 'App Owner') return true;
    return op.agencyId === activeOperator?.agencyId;
  });

  // Group operators by role
  const groupedUsers = {};
  roleHierarchy.forEach(role => groupedUsers[role] = []);
  
  visibleOperators.forEach(op => {
    // Determine target tier, fallback to Operator if unknown
    const tier = roleHierarchy.includes(op.role) ? op.role : 'Operator';
    groupedUsers[tier].push(op);
  });

  // Add profiles to the Model tier if they aren't already represented by a Model operator
  const existingModelOperatorProfileIds = new Set(
    groupedUsers['Model']?.map(op => op.profileId).filter(Boolean) || []
  );

  (profiles || []).forEach(profile => {
    // Only show profiles that the current viewer should see
    const opId = String(activeOperator?.id || activeOperator?._id || '');
    const isAssigned = (profile.assignees || []).some(a => String(a?.id || a?._id || a) === opId) || 
                       (profile.operators || []).some(o => String(o?.id || o?._id || o) === opId) ||
                       activeRole === 'APP OWNER' || activeRole === 'AGENCY ADMIN' || activeRole === 'MANAGER' || activeRole === 'SENIOR OPERATOR';

    if (isAssigned && !existingModelOperatorProfileIds.has(profile.id)) {
      // Create a virtual operator node for the profile
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

  // Keep only tiers that have users
  const activeTiers = roleHierarchy.filter(role => groupedUsers[role].length > 0);

  return (
    <div data-testid="page-hierarchy-container" style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', flex: 1, overflowY: 'auto', maxHeight: '100%', position: 'relative' }} className="fade-in custom-scrollbar">
      <div style={{ marginBottom: isMobile ? '2rem' : '4rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('teamHierarchy')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
          {t('teamHierarchyDesc')}
        </p>
      </div>

      {/* Org Chart Container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: isMobile ? '2rem' : '3rem',
        position: 'relative'
      }}>
        {activeTiers.map((tierName, index) => {
          const usersInTier = groupedUsers[tierName];
          const isLastTier = index === activeTiers.length - 1;

          return (
            <div key={tierName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
              
              {/* Tier Label */}
              <div style={{ 
                fontSize: '0.75rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em', 
                color: 'var(--text-secondary)', 
                fontWeight: '800', 
                marginBottom: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {tierName}
              </div>

              {/* Cards Row */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: '1.5rem', 
                width: '100%' 
              }}>
                {usersInTier.map(op => {
                   let visibleModelsCount = 0;
                   const opId = String(op?.id || op?._id || '');
                   if (!opId) return null;

                   if (op.role === 'APP OWNER' || op.role === 'AGENCY ADMIN' || op.role === 'MANAGER') {
                     // Tyto role vidí všechny profily agentury
                     visibleModelsCount = (profiles || []).length;
                   } else {
                     // Senior Operator a Operator vidí pouze ty profily, které jim byly manuálně přiřazeny
                     const assignedModels = (profiles || []).filter(p => {
                       if (!p) return false;
                       const asgs = Array.isArray(p.assignees) ? p.assignees : [];
                       const ops = Array.isArray(p.operators) ? p.operators : [];
                       return asgs.some(a => String(a?.id || a?._id || a) === opId) || 
                              ops.some(o => String(o?.id || o?._id || o) === opId);
                     });
                     visibleModelsCount = assignedModels.length;
                   }
                   
                   const showAssignedText = op.role?.toUpperCase() !== 'MODEL'; // Skrýt text pro modelky
                   
                   return (
                    <div key={op.id} className="glass-card zoom-hover" style={{ 
                      padding: '1.5rem', 
                      width: isMobile ? '100%' : '320px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      textAlign: 'center',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(167, 139, 250, 0.2))', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.4rem', 
                        fontWeight: '800', 
                        color: '#fff',
                        marginBottom: '1rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {op.avatar || op.name?.charAt(0)}
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                        {op.name}
                      </h3>
                      
                      {showAssignedText && (
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          <span style={{ color: visibleModelsCount > 0 ? 'var(--accent-color)' : 'inherit', fontWeight: visibleModelsCount > 0 ? '600' : 'normal' }}>
                            {visibleModelsCount}
                          </span> {visibleModelsCount === 1 ? t('profile').toLowerCase() : (visibleModelsCount >= 2 && visibleModelsCount <= 4) ? (t('profiles_2_4') || 'profily').toLowerCase() : (t('profiles_5_plus') || 'profilů').toLowerCase()}
                        </div>
                      )}

                      {/* Metrics simple view */}
                      {op.role?.toUpperCase() === 'MODEL' ? (
                        <div style={{ 
                          display: 'flex', 
                          gap: '1.5rem', 
                          marginTop: '1rem',
                          background: 'rgba(16, 185, 129, 0.1)', 
                          padding: '0.75rem 1.5rem', 
                          borderRadius: '12px',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>{op.metrics?.revenue || 0}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>CZK</div>
                          </div>
                          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{op.metrics?.bookings || 0}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{t('bookings').toUpperCase()}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          gap: '1.5rem', 
                          marginTop: showAssignedText ? '0' : '1rem',
                          background: 'rgba(0,0,0,0.2)', 
                          padding: '0.75rem 1.5rem', 
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{op.metrics?.messages || 0}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{t('messages').toUpperCase()}</div>
                          </div>
                          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{op.metrics?.conversion || '0%'}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{(t('conversion') || 'CONV.').toUpperCase()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Connecting Line downwards */}
              {!isLastTier && (
                <div style={{
                  width: '2px',
                  height: isMobile ? '2rem' : '3rem',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.02))',
                  marginTop: '1.5rem',
                  position: 'relative',
                  zIndex: 1
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HierarchyView;
