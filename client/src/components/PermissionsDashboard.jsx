import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Lock, Globe, Building2, Users, Package, Activity, MessageSquare, Save, RefreshCw, AlertCircle } from 'lucide-react';

import { useNexus } from '../context/NexusContext';

const PermissionsDashboard = ({ agencyId = null, onUpdate = null }) => {
  const nexus = useNexus();
  const { t, activeOperator, isMobile, API_BASE, token } = nexus;
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, [agencyId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/agency/roles${agencyId ? `?agencyId=${agencyId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError('Nepodařilo se načíst oprávnění z databáze.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (roleId, permKey) => {
    setRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permKey]: !role.permissions[permKey]
          }
        };
      }
      return role;
    }));
  };

  const handleSave = async (id) => {
    try {
      setSavingId(id);
      const role = roles.find(r => r.id === id);
      await axios.patch(`${API_BASE}/agency/roles/${id}/permissions`, {
        permissions: role.permissions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (onUpdate) onUpdate();
      // Optional: show local success state
    } catch (err) {
      console.error('Save failed:', err);
      alert('Chyba při ukládání oprávnění.');
    } finally {
      setSavingId(null);
    }
  };

  const CATEGORIES = [
    {
      id: 'global',
      label: t('infraTitle') || 'Globální správa',
      icon: Globe,
      color: '#3b82f6',
      perms: ['agencies', 'infrastructure', 'permissions', 'plans', 'global_features']
    },
    {
      id: 'agency',
      label: t('agencyMgmtTitle') || 'Správa agentury',
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

  if (loading) return (
    <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
      <RefreshCw size={32} className="spin" />
      <div style={{ fontWeight: '700' }}>Načítám oprávnění z databáze...</div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 'calc(1rem + env(safe-area-inset-left)) 1rem calc(1rem + max(env(safe-area-inset-bottom), 1rem) + env(safe-area-inset-right))' : '2rem', flex: 1, overflowY: 'auto', maxHeight: isMobile ? 'calc(100dvh - max(env(safe-area-inset-top), 1rem) - 3rem)' : '100%' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {agencyId ? `Oprávnění: Agentura ID ${agencyId.slice(0, 8)}` : t('rolePermissions')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem', margin: 0 }}>{t('rolePermissionsDesc')}</p>
        </div>
        {!agencyId && (
          <button onClick={fetchRoles} className="status-badge" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <RefreshCw size={14} /> OBNOVIT
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: isMobile ? '1rem' : '2.5rem' }}>
        {roles.map((roleData) => {
          const role = roleData.name;
          const perms = roleData.permissions || {};
          const isAppOwner = role === 'App Owner';
          const isSaving = savingId === roleData.id;

          return (
            <div key={roleData.id} className="glass-card" style={{ padding: '2.5rem', height: 'fit-content', border: isAppOwner ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--card-border)', background: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', background: isAppOwner ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {isAppOwner ? <Lock size={24} color="#fbbf24" /> : <Shield size={24} color="var(--accent-color)" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>{role}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.05em' }}>
                      {agencyId ? 'AGENCY SPECIFIC ROLE' : 'SYSTEM ROLE TEMPLATE'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {CATEGORIES.map(category => {
                  const categoryPerms = category.perms;
                  if (categoryPerms.length === 0 && !isAppOwner) return null;

                  return (
                    <div key={category.id} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
                        <category.icon size={18} color={category.color} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{category.label}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {(isAppOwner ? category.perms : categoryPerms).map((permKey) => {
                          const isEnabled = perms[permKey] || isAppOwner;
                          return (
                            <div key={permKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.95rem', color: isEnabled ? 'white' : 'var(--text-secondary)', fontWeight: '700' }}>
                                  {t(permKey) || permKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </span>
                              </div>
                              <div 
                                onClick={() => !isAppOwner && handleToggle(roleData.id, permKey)}
                                className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                                style={{ 
                                  width: '38px', height: '20px', background: isEnabled ? (isAppOwner ? 'rgba(251, 191, 36, 0.5)' : category.color) : 'rgba(255,255,255,0.05)',
                                  borderRadius: '20px', position: 'relative', cursor: isAppOwner ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
                                  border: '1px solid var(--card-border)', opacity: isAppOwner ? 0.6 : 1
                                }}
                              >
                                <div style={{ 
                                  width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                                  position: 'absolute', top: '2px', left: isEnabled ? '20px' : '2px', transition: 'all 0.3s'
                                }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {!isAppOwner && (
                  <button 
                    onClick={() => handleSave(roleData.id)}
                    disabled={isSaving}
                    style={{ 
                      width: '100%', padding: '1rem', background: 'var(--accent-color)', color: 'white', 
                      borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      marginTop: '1rem', transition: 'all 0.2s', opacity: isSaving ? 0.7 : 1
                    }}
                  >
                    {isSaving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                    {isSaving ? 'Ukládám...' : 'ULOŽIT OPRÁVNĚNÍ'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionsDashboard;
