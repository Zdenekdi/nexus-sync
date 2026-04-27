/* src/components/Views/AgenciesView.jsx */
import React from 'react';
import { Building2, Users, ShieldCheck } from 'lucide-react';

import { useNexus } from '../../context/NexusContext';

const AgenciesView = () => {
  const nexus = useNexus();
  const { 
    agencies, 
    profiles: _profiles, 
    operators: _operators, 
    t, 
    lang,
    isMobile, 
    activeOperator,
    handleAddAgency: onAddAgency, 
    handleAgencyDetail: onDetail, 
    handleImpersonateAgency: onImpersonate, 
    handleDeleteAgency: onDelete, 
    handleToggleAgencyStatus: _onToggleStatus 
  } = nexus;
  // Admin Referrals section
  const [allReferrals, setAllReferrals] = React.useState([]);
  const [isAdminRefLoading, setIsAdminRefLoading] = React.useState(false);

  const loadAdminReferrals = React.useCallback(async () => {
    if (!activeOperator?.isAppOwner) return;
    setIsAdminRefLoading(true);
    const data = await nexus.fetchAllReferrals();
    setAllReferrals(data);
    setIsAdminRefLoading(false);
  }, [activeOperator?.isAppOwner, nexus]);

  React.useEffect(() => {
    loadAdminReferrals();
  }, [loadAdminReferrals]);

  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar" data-testid="page-agencies-container">
      <h2 data-testid="page-agencies-title" style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {t('agencyMgmtTitle')}
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>
        {t('agencyMgmtSubtitle')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={24} color="#8b5cf6" /> {t('portfolioManager')}
            </h3>
            <button data-testid="btn-add-agency" onClick={onAddAgency} className="action-btn" style={{ width: 'auto', padding: '0.6rem 1.25rem' }}>
              {t('provisionNew')}
            </button>
          </div>

          <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
            <table data-testid="table-agencies" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('agencyInfo') || 'Agency Info'}</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('status')}</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency, i) => {
                  const sub = agency.subscription || { status: 'active', plan: 'Pro' };
                  return (
                    <tr key={agency.id} data-testid={`row-agency-${agency.id}`} style={{ borderBottom: i < agencies.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{agency.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region: {agency.region || 'EU'}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800',
                          background: sub.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: sub.status === 'active' ? 'var(--success-color)' : 'var(--_err-color)'
                        }}>
                          {(sub.status || 'INACTIVE').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button data-testid={`btn-agency-detail-${agency.id}`} onClick={() => onDetail(agency)} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.05em' }}>DETAIL</button>
                          <button data-testid={`btn-agency-impersonate-${agency.id}`} onClick={() => onImpersonate(agency)} className="status-badge" style={{ color: 'var(--accent-color)' }}>{t('impersonate')}</button>
                          <button data-testid={`btn-agency-delete-${agency.id}`} onClick={() => onDelete(agency.id)} className="status-badge" style={{ color: '#ef4444' }}>DELETE</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Referrals Section (App Owner only) */}
        {activeOperator?.isAppOwner && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={24} color="#f59e0b" /> {lang === 'cz' ? 'Centrální správa doporučení' : 'Master Referral Management'}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(245, 158, 11, 0.05)', borderBottom: '1px solid var(--card-border)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>REFERRER (AMBASADOR)</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>REFERRED (NOVÁ AGENTURA)</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>STATUS</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textAlign: 'right' }}>ODMĚNA & AKCE</th>
                  </tr>
                </thead>
                <tbody>
                  {isAdminRefLoading ? (
                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Načítání...</td></tr>
                  ) : allReferrals.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Žádná doporučení nenalezena.</td></tr>
                  ) : allReferrals.map((ref, i) => {
                    const isPending = ref.status === 'pending';
                    return (
                      <tr key={ref.id} style={{ borderBottom: i < allReferrals.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ fontWeight: '700' }}>{ref.referrer?.name || 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {ref.referrerId}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ fontWeight: '700' }}>{ref.referred?.name || 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {ref.referredId}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800',
                            background: isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isPending ? '#f59e0b' : '#10b981'
                          }}>
                            {ref.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                          {isPending ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <input 
                                type="number" 
                                defaultValue="50" 
                                id={`reward-${ref.id}`}
                                style={{ width: '60px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'white', padding: '0.2rem 0.5rem', fontSize: '0.8rem', fontWeight: '800' }}
                              />
                              <button 
                                onClick={async () => {
                                  const amount = document.getElementById(`reward-${ref.id}`).value;
                                  const res = await nexus.handleConfirmReferral(ref.id, Number(amount));
                                  if (res.success) loadAdminReferrals();
                                }}
                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                              >
                                CONFIRM
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontWeight: '900', color: '#10b981' }}>€{ref.rewardAmount}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgenciesView;
