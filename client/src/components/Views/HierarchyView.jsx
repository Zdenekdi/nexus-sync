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
    if (op.role === 'App Owner') return false; 
    // DEBUG: Show all for now to find ID mismatch
    return true; 
  });

  // Group operators by role
  const groupedUsers = {};
  roleHierarchy.forEach(role => groupedUsers[role] = []);
  
  visibleOperators.forEach(op => {
    const tier = roleHierarchy.includes(op.role) ? op.role : 'Operator';
    groupedUsers[tier].push(op);
  });

  // Add profiles to the Model tier
  const existingModelOperatorProfileIds = new Set(
    groupedUsers['Model']?.map(op => op.profileId).filter(Boolean) || []
  );

  (profiles || []).forEach(profile => {
    // Show all for debug
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

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <div data-testid="page-hierarchy-container" style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', flex: 1, overflowY: 'auto', maxHeight: '100%', position: 'relative' }} className="fade-in custom-scrollbar">
      <div style={{ marginBottom: isMobile ? '2rem' : '4rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('teamHierarchy')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
          {t('teamHierarchyDesc')}
        </p>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.1)', marginTop: '0.5rem' }}>
          Debug: MyAgencyID: {activeOperator?.agencyId || 'NONE'} | TotalOps: {operators.length} | TotalProfiles: {profiles.length}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: isMobile ? '2rem' : '3rem',
        position: 'relative'
      }}>
        {activeTiers.map((tierName, index) => {
          const usersInTier = groupedUsers[tierName];

          return (
            <div key={tierName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
              <div style={{ 
                fontSize: '0.75rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em', 
                color: 'var(--text-secondary)', 
                fontWeight: '800', 
                marginBottom: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {tierName}
              </div>

              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: isMobile ? '1rem' : '2rem',
                width: '100%'
              }}>
                {usersInTier.map(user => (
                  <div key={user.id} style={{
                    width: isMobile ? '140px' : '200px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                    position: 'relative'
                  }} className="hierarchy-card">
                    <div style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                      {user.avatar || user.name.charAt(0)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: 'white', marginBottom: '0.2rem' }}>{user.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                        {user.agencyId || 'No Agency'}
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      marginTop: '0.5rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      width: '100%',
                      justifyContent: 'center'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{user.metrics?.bookings || 0}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bookings</div>
                      </div>
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
