import React from 'react';
import { useNexus } from '../../context/ContextHook';
import { normalizeRole } from '../../utils/roleUtils';

const HierarchyView = () => {
  const nexus = useNexus() || {};
  const {
    isMobile = false,
    t = (k) => k,
    activeRole: _activeRole = '',
    activeOperator: _activeOperator = null,
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
    <div data-testid="page-hierarchy-container" className="hierarchy-page-container fade-in">
      <style>{`
        .hierarchy-page-container {
          padding: ${isMobile ? '1.5rem 1rem' : '3rem'};
          flex: 1;
          overflow-y: auto;
          max-height: 100%;
          position: relative;
          background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent 400px),
                      radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.05), transparent 400px);
        }

        .hierarchy-card {
          width: ${isMobile ? '140px' : '220px'};
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          position: relative;
          backdrop-filter: blur(12px);
          z-index: 5;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .hierarchy-card:hover {
          transform: translateY(-8px) scale(1.02);
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(96, 165, 250, 0.4);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 
                      0 0 20px rgba(59, 130, 246, 0.1);
        }

        .tier-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.25em;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 900;
          background: #0a0c10;
          padding: 0.4rem 1.2rem;
          border-radius: 30px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          backdrop-filter: blur(10px);
          z-index: 10;
          white-space: nowrap;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.1);
        }

        .line-vertical {
          width: 2px;
          background: linear-gradient(to bottom, rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.2));
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.15);
        }

        .line-horizontal {
          height: 2px;
          background: rgba(59, 130, 246, 0.2);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.1);
          border-radius: 2px;
        }

        .view-details-btn {
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          padding: 0.5rem 1.2rem;
          border-radius: 14px;
          font-size: 0.8rem;
          font-weight: 800;
          margin-top: 0.5rem;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .hierarchy-card:hover .view-details-btn {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tier-animate {
          animation: slideDown 0.6s ease forwards;
        }
      `}</style>

      <div style={{ marginBottom: isMobile ? '2.5rem' : '4.5rem', textAlign: 'center' }}>
        <h2 style={{ 
          fontSize: isMobile ? '2rem' : '3.2rem', 
          fontWeight: '950', 
          marginBottom: '0.8rem', 
          background: 'linear-gradient(135deg, #fff 30%, #60a5fa 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          {t('teamHierarchy') || 'Hierarchie týmu'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? '0.95rem' : '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          {t('teamHierarchyDesc') || 'Kompletní přehled struktury vaší agentury.'}
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        width: '100%',
        position: 'relative'
      }}>
        {activeTiers.map((tierName, index) => {
          const usersInTier = groupedUsers[tierName];
          const isModelTier = tierName === 'Model';

          return (
            <div key={tierName} className="tier-animate" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              position: 'relative', 
              width: '100%',
              zIndex: 10 - index,
              animationDelay: `${index * 0.15}s`
            }}>
              
              {/* Continuous vertical line container with label inside */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                width: '100%',
                position: 'relative',
                marginBottom: '2rem'
              }}>
                <div className="line-vertical" style={{ height: '5rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div className="tier-label" style={{ position: 'absolute' }}>
                    {t(`roleLabels.${normalizeRole(tierName)}`) || tierName}
                  </div>
                </div>
              </div>

              {/* Horizontal connection line for multiple items */}
              {usersInTier.length > 1 && (
                <div style={{ position: 'relative', width: '80%', maxWidth: '1200px', height: '2px', marginBottom: '2.5rem' }}>
                  <div className="line-horizontal" style={{ width: '100%' }} />
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: isMobile ? '1.2rem' : '4rem',
                width: '100%',
                marginBottom: '2rem'
              }}>
                {usersInTier.map(user => (
                  <div key={user.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    {/* Vertical line from horizontal bridge to card */}
                    {index > 0 && (
                      <div className="line-vertical" style={{
                        position: 'absolute',
                        top: usersInTier.length > 1 ? '-2.5rem' : '-2.5rem',
                        height: '2.5rem'
                      }} />
                    )}
                    
                    <div className="hierarchy-card" onClick={() => {
                      const id = user.id.startsWith('profile-') ? user.id.replace('profile-', '') : user.id;
                      nexus.setActiveProfileId(id);
                      nexus.navigate('/profiles');
                    }}>
                      <div style={{ 
                        width: '72px', 
                        height: '72px', 
                        borderRadius: '24px', 
                        background: isModelTier ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        fontWeight: '800',
                        color: 'white',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.15)'
                      }}>
                        {user.avatar || user.name?.charAt(0) || '?'}
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'white', marginBottom: '0.3rem' }}>{user.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', fontWeight: '600' }}>
                          {user.agencyId || (user.agencyName || 'Nexus Hub')}
                        </div>
                      </div>

                      {isModelTier && (
                        <button className="view-details-btn">
                          {t('profile') || 'Profil'}
                        </button>
                      )}
                    </div>

                    {/* Vertical line from card down to next tier bridge */}
                    {index < activeTiers.length - 1 && usersInTier.length === 1 && (
                      <div className="line-vertical" style={{ height: '3rem', marginTop: '0rem' }} />
                    )}
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
