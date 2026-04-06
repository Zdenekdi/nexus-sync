import React from 'react';
import { Activity, UserPlus, Trophy, Clock, Link, Copy, Check } from 'lucide-react';

import { useNexus } from '../../context/NexusContext';

const ReferralsView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    lang,
    activeOperator,
    showToast
  } = nexus;
  const referralLink = `https://nexus.sync/ref/${activeOperator?.id || 'default'}`;

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <div style={{ marginBottom: isMobile ? '1.5rem' : '3rem' }}>
        <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('referralProgram')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>{t('referralsSubtitle')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '2rem' : '3rem' }}>
        {[
          { label: (t('clicks') || 'CLICKS').toUpperCase(), value: 0, icon: Activity, color: '#3b82f6' },
          { label: (t('signups') || 'SIGNUPS').toUpperCase(), value: 0, icon: UserPlus, color: '#10b981' },
          { label: (t('earned') || 'EARNED').toUpperCase(), value: '£0', icon: Trophy, color: '#f59e0b' },
          { label: (t('pending') || 'PENDING').toUpperCase(), value: '£0', icon: Clock, color: 'var(--text-secondary)' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: isMobile ? '1.15rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <stat.icon size={16} color={stat.color} />
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '900' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ flex: 1, padding: isMobile ? '1.5rem' : '2rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link size={20} color="#f59e0b" /> {t('referralLinkHeader')}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {t('referralLinkDesc')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)', fontFamily: 'monospace', fontSize: '0.85rem', color: '#f59e0b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink}
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(referralLink).then(() => showToast(lang === 'cz' ? 'Odkaz zkopírován ✓' : 'Link copied ✓', 'success'))} 
              className="action-btn" 
              style={{ width: 'auto', padding: '0 1.25rem', marginTop: 0, background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Copy size={18} />
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ width: isMobile ? '100%' : '400px', padding: isMobile ? '1.5rem' : '2rem' }}>
          <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('whyRefer')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={18} color="#10b981" />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{t('bonusTitle')}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('bonusDesc')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsView;
