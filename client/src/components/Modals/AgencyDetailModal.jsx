/* src/components/Modals/AgencyDetailModal.jsx */
import React from 'react';
import { X, Shield, ShieldCheck, Copy } from 'lucide-react';

const AgencyDetailModal = ({ 
  agency, 
  onClose, 
  onManageRoles, 
  operators, 
  showToast, 
  lang: _lang 
}) => {
  if (!agency) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '2rem 2.5rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '0.25rem' }}>{agency.name}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.05em' }}>{agency.region?.toUpperCase()}</div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>SUBSCRIPTION</div>
              <div style={{ fontWeight: '700' }}>{agency.subscription?.plan || 'Standard'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>TEAM SIZE</div>
              <div style={{ fontWeight: '700' }}>{operators.filter(o => o.agencyId === agency.id).length} Active</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>PRIMARY MANAGER</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800' }}>
                {agency.managerName?.charAt(0) || 'M'}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{agency.managerName || 'N/A'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{agency.managerEmail || 'No contact provided'}</div>
              </div>
            </div>
          </div>

          <button 
            onClick={onManageRoles}
            className="action-btn"
            style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: '800', width: '100%', padding: '1rem', borderRadius: '12px' }}
          >
            <Shield size={18} color="var(--accent-color)" /> MANAGE ROLE PERMISSIONS
          </button>

          <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <ShieldCheck size={14} color="var(--accent-color)" />
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '0.1em' }}>INVITATION CODE</div>
            </div>
            {agency.inviteCode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <code style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center' }}>{agency.inviteCode}</code>
                <button onClick={() => { navigator.clipboard.writeText(agency.inviteCode); showToast('Copied!', 'success'); }} style={{ padding: '0 1rem', height: '52px', background: 'var(--accent-color)', color: 'white', borderRadius: '10px', fontWeight: '800' }}>
                  <Copy size={16} />
                </button>
              </div>
            ) : <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Code not generated</div>}
          </div>
        </div>

        <div style={{ padding: '1.5rem 2.5rem 2rem', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgencyDetailModal;
