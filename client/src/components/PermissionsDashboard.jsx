import React from 'react';
import { Shield } from 'lucide-react';

const PermissionsDashboard = ({ t, rolePermissions, setRolePermissions, activeOperator }) => {
  const isMobile = window.innerWidth < 768;
  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('rolePermissions')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '1rem' : '1.1rem' }}>{t('rolePermissionsDesc')}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: isMobile ? '1rem' : '2rem' }}>
        {Object.entries(rolePermissions).map(([role, perms]) => (
          <div key={role} className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color="var(--accent-color)" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{role}</h3>
              </div>
              <div className="status-badge-small" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)', fontWeight: '700' }}>
                {Object.values(perms).filter(v => v).length} {t('enabled')}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Object.entries(perms).map(([permKey, isEnabled]) => (
                <div key={permKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.9rem', color: isEnabled ? 'white' : 'var(--text-secondary)', fontWeight: '600' }}>
                    {t(permKey) || permKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                  <div 
                    onClick={() => {
                      setRolePermissions(prev => ({
                        ...prev,
                        [role]: { ...prev[role], [permKey]: !isEnabled }
                      }));
                    }}
                    className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                    style={{ 
                      width: '34px', height: '18px', background: isEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s',
                      border: '1px solid var(--card-border)'
                    }}
                  >
                    <div style={{ 
                      width: '12px', height: '12px', background: 'white', borderRadius: '50%',
                      position: 'absolute', top: '2px', left: isEnabled ? '18px' : '3px', transition: 'all 0.3s'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionsDashboard;
