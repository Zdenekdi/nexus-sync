import React from 'react';
import { Shield, Lock, Globe, Building2, Users, Package, Activity, MessageSquare } from 'lucide-react';

const PermissionsDashboard = ({ t, rolePermissions, setRolePermissions, activeOperator }) => {
  const isMobile = window.innerWidth < 768;

  const CATEGORIES = [
    {
      id: 'global',
      label: t('infraTitle') || 'Global Management',
      icon: Globe,
      color: '#3b82f6',
      perms: ['agencies', 'infrastructure', 'permissions', 'plans', 'global_features']
    },
    {
      id: 'agency',
      label: t('agencyMgmtTitle') || 'Agency Management',
      icon: Building2,
      color: '#10b981',
      perms: ['hierarchy', 'analytics', 'audit_logs', 'settings']
    },
    {
      id: 'operativa',
      label: 'Provozní sekce - Operativa',
      icon: MessageSquare,
      color: '#8b5cf6',
      perms: ['messaging', 'calendar', 'profiles', 'web_profiles', 'device_setup', 'qa_hub', 'referrals']
    },
    {
      id: 'logistika',
      label: 'Provozní sekce - Logistika',
      icon: Package,
      color: '#f59e0b',
      perms: ['inventory']
    }
  ];

  return (
    <div style={{ padding: isMobile ? 'calc(1rem + env(safe-area-inset-left)) 1rem calc(1rem + max(env(safe-area-inset-bottom), 1rem) + env(safe-area-inset-right))' : '2rem', flex: 1, overflowY: 'auto', maxHeight: isMobile ? 'calc(100dvh - max(env(safe-area-inset-top), 1rem) - 3rem)' : '100%' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('rolePermissions')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>{t('rolePermissionsDesc')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: isMobile ? '1rem' : '2.5rem' }}>
        {Object.entries(rolePermissions).map(([role, perms]) => {
          const isAppOwner = role === 'App Owner';
          return (
            <div key={role} className="glass-card" style={{ padding: '2.5rem', height: 'fit-content', border: isAppOwner ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--card-border)', background: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', background: isAppOwner ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {isAppOwner ? <Lock size={24} color="#fbbf24" /> : <Shield size={24} color="var(--accent-color)" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>{role}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.05em' }}>SYSTEM ROLE LEVEL</div>
                  </div>
                </div>
                {isAppOwner ? (
                  <div className="status-badge-small" style={{ borderColor: '#fbbf24', color: '#fbbf24', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>
                    <Lock size={12} /> LOCKED ACCESS
                  </div>
                ) : (
                  <div className="status-badge-small" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)', fontWeight: '800', padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>
                    {Object.values(perms).filter(v => v).length} PERMISSIONS ACTIVE
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {CATEGORIES.map(category => {
                  const categoryPerms = Object.entries(perms).filter(([key]) => category.perms.includes(key));
                  if (categoryPerms.length === 0) return null;

                  return (
                    <div key={category.id} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
                        <category.icon size={18} color={category.color} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{category.label}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {categoryPerms.map(([permKey, isEnabled]) => (
                          <div key={permKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.95rem', color: isEnabled ? 'white' : 'var(--text-secondary)', fontWeight: '700' }}>
                                {t(permKey) || permKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>Access ID: {permKey}</span>
                            </div>
                            {isAppOwner ? (
                              <div style={{
                                width: '38px', height: '20px',
                                background: isEnabled ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '20px', position: 'relative',
                                border: isEnabled ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid var(--card-border)',
                                cursor: 'not-allowed', opacity: 0.8
                              }}>
                                <div style={{
                                  width: '14px', height: '14px', background: isEnabled ? '#fbbf24' : 'rgba(255,255,255,0.3)', borderRadius: '50%',
                                  position: 'absolute', top: '2px', left: isEnabled ? '20px' : '2px'
                                }}></div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => {
                                  setRolePermissions(prev => ({
                                    ...prev,
                                    [role]: { ...prev[role], [permKey]: !isEnabled }
                                  }));
                                }}
                                className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                                style={{ 
                                  width: '38px', height: '20px', background: isEnabled ? category.color : 'rgba(255,255,255,0.05)',
                                  borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s',
                                  border: '1px solid var(--card-border)'
                                }}
                              >
                                <div style={{ 
                                  width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                                  position: 'absolute', top: '2px', left: isEnabled ? '20px' : '2px', transition: 'all 0.3s'
                                }}></div>
                              </div>
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
        })}
      </div>
    </div>
  );
};

export default PermissionsDashboard;


