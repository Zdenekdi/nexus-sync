import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Shield, Lock, Globe, Building2, Package as PackageIcon, MessageSquare, Save, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';

import { useNexus } from '../context/ContextHook';

const PermissionsDashboard = ({ agencyId: agencyIdProp = null, onUpdate = null }) => {
  const nexus = useNexus();
  const { t, activeOperator, isMobile, API_BASE, token, showToast, agencies, isAppOwner } = nexus;

  // App Owner can switch between global templates and per-agency view
  const [selectedAgencyId, setSelectedAgencyId] = useState(agencyIdProp);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  // When agencyIdProp changes externally (e.g. opened from AgencyDetail modal), sync it
  useEffect(() => { setSelectedAgencyId(agencyIdProp); }, [agencyIdProp]);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const url = `${API_BASE}/agency/roles${selectedAgencyId ? `?agencyId=${selectedAgencyId}` : ''}`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (_err) {
      console.error('Failed to fetch roles:', _err);
      setError(t('failed_to_load_permissions') || 'Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, selectedAgencyId, token, t]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleToggle = (roleId, permKey) => {
    setRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return { ...role, permissions: { ...role.permissions, [permKey]: !role.permissions[permKey] } };
      }
      return role;
    }));
  };

  const handleSave = async (id) => {
    try {
      setSavingId(id);
      const role = roles.find(r => r.id === id);
      if (!role) return;
      const { data: result } = await axios.patch(`${API_BASE}/agency/roles/${id}/permissions`, {
        permissions: role.permissions
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (result) {
        showToast(t('permissions_saved') || 'Saved.', 'success');
        if (onUpdate) onUpdate();
      }
    } catch (_err) {
      console.error('Save failed:', _err);
      showToast(t('failed_to_save_permissions') || 'Save failed.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const CATEGORIES = [
    {
      id: 'global',
      label: t('infraUnit') || 'Globální správa',
      icon: Globe,
      color: '#3b82f6',
      perms: ['agencies', 'infrastructure', 'permissions', 'plans', 'global_features']
    },
    {
      id: 'agency',
      label: t('agencyUnit') || 'Správa agentury',
      icon: Building2,
      color: '#10b981',
      perms: ['hierarchy', 'analytics', 'audit_logs', 'settings']
    },
    {
      id: 'operativa',
      label: `${t('operationsUnit') || 'Operativa'} — ${t('messaging') || 'Zprávy'}`,
      icon: MessageSquare,
      color: '#8b5cf6',
      perms: ['messaging', 'calendar', 'profiles', 'web_profiles', 'device_setup', 'qa_hub', 'referrals']
    },
    {
      id: 'logistika',
      label: `${t('operationsUnit') || 'Operativa'} — ${t('inventory') || 'Sklad'}`,
      icon: PackageIcon,
      color: '#f59e0b',
      perms: ['inventory']
    }
  ];

  const selectedAgencyName = selectedAgencyId
    ? (agencies || []).find(a => a.id === selectedAgencyId)?.name || selectedAgencyId
    : null;

  return (
    <div
      data-testid="page-permissions-container"
      style={{
        padding: isMobile ? '1rem' : '2rem',
        flex: 1, overflowY: 'auto', maxHeight: '100%'
      }}
      className="fade-in custom-scrollbar"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{
            fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem',
            background: 'linear-gradient(to right, #3b82f6, #10b981)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            {t('rolePermissions') || 'Oprávnění rolí'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1rem', margin: 0 }}>
            {selectedAgencyName
              ? `${t('agencyInsight') || 'Agentura'}: ${selectedAgencyName}`
              : (t('rolePermissionsDesc') || 'Globální šablony oprávnění.')}
          </p>
        </div>
        <button 
          onClick={fetchRoles} 
          className="status-badge" 
          style={{ 
            padding: '0.6rem 1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            cursor: 'pointer', 
            whiteSpace: 'nowrap',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontWeight: '700',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('refresh') || 'Obnovit'}
        </button>
      </div>

      {/* Agency Selector — App Owner only */}
      {isAppOwner && (
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Shield size={20} color="#f59e0b" />
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {t('systemAdministration') || 'Zobrazit oprávnění pro'}:
          </span>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <select
              value={selectedAgencyId || ''}
              onChange={e => setSelectedAgencyId(e.target.value || null)}
              style={{
                width: '100%', appearance: 'none', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--card-border)', borderRadius: '10px',
                color: 'white', padding: '0.6rem 2.5rem 0.6rem 1rem',
                fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer'
              }}
            >
              <option value="">{t('global') || 'Globální šablony'}</option>
              {(agencies || []).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" />
          <div style={{ fontWeight: '700' }}>{t('loading') || 'Načítání...'}</div>
        </div>
      ) : roles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
          <Shield size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p>{t('noResults') || 'Žádné role nenalezeny.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: isMobile ? '1rem' : '2.5rem' }}>
          {roles.map((roleData) => {
            const roleName = roleData.name;
            const perms = roleData.permissions || {};
            const isOwnerRole = roleName === 'App Owner';
            const isSaving = savingId === roleData.id;

            return (
              <div key={roleData.id} className="glass-card" style={{
                padding: '2.5rem', height: 'fit-content',
                border: isOwnerRole ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--card-border)',
                background: 'rgba(15, 23, 42, 0.4)'
              }}>
                {/* Role header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '44px', height: '44px',
                      background: isOwnerRole ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      {isOwnerRole ? <Lock size={22} color="#fbbf24" /> : <Shield size={22} color="var(--accent-color)" />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', margin: 0 }}>{roleName}</h3>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.05em', marginTop: '2px' }}>
                        {roleData.isAppOwner ? 'GLOBÁLNÍ · NEOMEZENÝ PŘÍSTUP' : roleData.isManager ? 'MANAŽERSKÁ ÚROVEŇ' : (roleName === 'Model' ? 'MODELKOVSKÁ ÚROVEŇ' : 'OPERÁTORSKÁ ÚROVEŇ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Merge Toggle (App Owner Only, for Manager role in specific agency) */}
                {isAppOwner && selectedAgencyId && roleName === 'Manager' && (
                  <div style={{ 
                    marginBottom: '2rem', padding: '1rem', borderRadius: '12px', 
                    background: perms.merged_with_admin ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: perms.merged_with_admin ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--card-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield size={18} color={perms.merged_with_admin ? '#10b981' : 'var(--text-dim)'} />
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: perms.merged_with_admin ? '#10b981' : 'white' }}>
                            {t('merge_with_admin') || 'Sloučit s Agency Admin'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {t('merge_with_admin_desc') || 'Umožní manažerovi spravovat uživatele a nastavení.'}
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={async () => {
                          try {
                            setSavingId(roleData.id);
                            const res = await axios.patch(`${API_BASE}/agency/roles/${roleData.id}/toggle-admin-merge`, {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.data.success) {
                              showToast(t('permissions_saved') || 'Uloženo', 'success');
                              fetchRoles();
                            }
                          } catch (err) {
                            showToast(t('update_failed') || 'Chyba', 'error');
                          } finally {
                            setSavingId(null);
                          }
                        }}
                        className={`toggle-switch ${perms.merged_with_admin ? 'active' : ''}`}
                        style={{
                          width: '38px', height: '20px',
                          background: perms.merged_with_admin ? '#10b981' : 'rgba(255,255,255,0.07)',
                          borderRadius: '20px', position: 'relative', cursor: 'pointer',
                          transition: 'all 0.25s', border: '1px solid var(--card-border)'
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                          position: 'absolute', top: '2px', left: perms.merged_with_admin ? '20px' : '2px', transition: 'all 0.25s'
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Permission categories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {CATEGORIES.map(category => (
                    <div key={category.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '1rem' }}>
                        <category.icon size={15} color={category.color} strokeWidth={2.5} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {category.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {category.perms.map((permKey) => {
                          let isEnabled = !!perms[permKey];
                          // App Owner always has global perms locked on
                          if (isOwnerRole && ['agencies', 'infrastructure', 'permissions', 'plans', 'global_features'].includes(permKey)) {
                            isEnabled = true;
                          }
                          const label = (() => {
                            const translated = t(permKey);
                            return translated === permKey
                              ? permKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                              : translated;
                          })();

                          return (
                            <div key={permKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.9rem', color: isEnabled ? 'white' : 'var(--text-dim)', fontWeight: '600' }}>
                                {label}
                              </span>
                              <div
                                onClick={() => !isOwnerRole && handleToggle(roleData.id, permKey)}
                                data-testid={`perm-toggle-${roleData.id}-${permKey}`}
                                className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                                style={{
                                  width: '38px', height: '20px',
                                  background: isEnabled ? (isOwnerRole ? 'rgba(251, 191, 36, 0.7)' : category.color) : 'rgba(255,255,255,0.07)',
                                  borderRadius: '20px', position: 'relative',
                                  cursor: isOwnerRole ? 'default' : 'pointer',
                                  transition: 'all 0.25s', border: '1px solid var(--card-border)',
                                  flexShrink: 0
                                }}
                              >
                                <div style={{
                                  width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                                  position: 'absolute', top: '2px',
                                  left: isEnabled ? '20px' : '2px', transition: 'all 0.25s'
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save button — not for App Owner role card */}
                {!isOwnerRole && (
                  <button
                    onClick={() => handleSave(roleData.id)}
                    data-testid={`save-permissions-${roleData.id}`}
                    disabled={isSaving}
                    style={{
                      width: '100%', padding: '0.9rem', marginTop: '1.5rem',
                      background: 'var(--accent-color)', color: 'white',
                      borderRadius: '12px', fontWeight: '800', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '0.6rem',
                      transition: 'all 0.2s', opacity: isSaving ? 0.7 : 1
                    }}
                  >
                    {isSaving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                    {isSaving ? t('loading') : (t('save_permissions') || 'ULOŽIT OPRÁVNĚNÍ')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PermissionsDashboard;
