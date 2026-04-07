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
    isMobile, 
    handleAddAgency: onAddAgency, 
    handleAgencyDetail: onDetail, 
    handleImpersonateAgency: onImpersonate, 
    handleDeleteAgency: onDelete, 
    handleToggleAgencyStatus: _onToggleStatus 
  } = nexus;
  return (
    <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
            <button onClick={onAddAgency} className="action-btn" style={{ width: 'auto', padding: '0.6rem 1.25rem' }}>
              {t('provisionNew')}
            </button>
          </div>

          <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('agencyRegion')}</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('status')}</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency, i) => {
                  const sub = agency.subscription || { status: 'active', plan: 'Pro' };
                  return (
                    <tr key={agency.id} style={{ borderBottom: i < agencies.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{agency.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region: {agency.region || 'EU'}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800',
                          background: sub.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: sub.status === 'active' ? 'var(--success-color)' : 'var(--error-color)'
                        }}>
                          {(sub.status || 'INACTIVE').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button onClick={() => onDetail(agency)} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.05em' }}>DETAIL</button>
                          <button onClick={() => onImpersonate(agency)} className="status-badge" style={{ color: 'var(--accent-color)' }}>{t('impersonate')}</button>
                          <button onClick={() => onDelete(agency.id)} className="status-badge" style={{ color: '#ef4444' }}>DELETE</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgenciesView;
