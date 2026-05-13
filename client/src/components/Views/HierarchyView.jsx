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
          z-index: 1;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .hierarchy-card:hover {
          transform: translateY(-8px) scale(1.02);
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(96, 165, 250, 0.4);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 
                      0 0 20px rgba(59, 130, 246, 0.1);
        }

        .hierarchy-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.05));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .tier-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 800;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.5rem 1.5rem;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(5px);
        }

        .connection-line {
          background: linear-gradient(to bottom, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.1));
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.1);
        }

        .view-details-btn {
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          padding: 0.4rem 1rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          margin-top: 0.5rem;
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
          {t('teamHierarchyDesc') || 'Kompletní přehled struktury vaší agentury v reálném čase.'}
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
          const isModelTier = tierName === 'Model';

          return (
            <div key={tierName} className="tier-animate" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              position: 'relative', 
              width: '100%',
              marginTop: index === 0 ? '0' : '3rem',
              animationDelay: `${index * 0.15}s`
            }}>
              <div className="tier-label">
                {t(`roleLabels.${normalizeRole(tierName)}`) || tierName}
              </div>

              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: isMobile ? '1.2rem' : '3rem',
                width: '100%'
              }}>
                {usersInTier.map(user => (
                  <div key={user.id} style={{ position: 'relative' }}>
                    {/* Vertical line from top to card */}
                    <div className="connection-line" style={{
                      position: 'absolute',
                      top: '-1.5rem',
                      left: '50%',
                      width: '2px',
                      height: '1.5rem',
                      display: index === 0 ? 'none' : 'block'
                    }} />
                    
                    <div className="hierarchy-card" onClick={() => {
                      if (user.isProfileOnly) nexus.setActiveProfileId(user.id.replace('profile-', ''));
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
                        {user.avatar || user.name.charAt(0)}
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'white', marginBottom: '0.3rem' }}>{user.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', fontWeight: '600' }}>
                          {user.agencyId || (user.agencyName || 'Nexus Hub')}
                        </div>
                      </div>

                      {isModelTier && (
                        <button className="view-details-btn">
                          {t('viewProfile') || 'Profil'}
                        </button>
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
                  <div className="connection-line" style={{
                    width: '2px',
                    height: isMobile ? '1.5rem' : '2.5rem'
                  }} />
                  <div className="connection-line" style={{
                    width: '85%',
                    maxWidth: '1200px',
                    height: '2px',
                    borderRadius: '2px',
                    opacity: 0.5
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
