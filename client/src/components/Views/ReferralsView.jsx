import React, { useState, useEffect, useCallback } from 'react';
import { Activity, UserPlus, Trophy, Clock, Link, Copy, Check, RefreshCw, Sparkles } from 'lucide-react';
import axios from 'axios';

import { useNexus } from '../../context/NexusContext';

const ReferralsView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    lang,
    showToast,
    API_BASE,
    token
  } = nexus;

  const [stats, setStats] = useState({ referralCode: null, totalSignups: 0, confirmed: 0, pending: 0, totalEarned: 0, pendingEarned: 0, referrals: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/referrals/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load referral stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post(`${API_BASE}/referrals/generate-code`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(prev => ({ ...prev, referralCode: res.data.referralCode }));
      showToast(lang === 'cz' ? 'Kód vygenerován ✓' : 'Code generated ✓', 'success');
    } catch (err) {
      showToast(lang === 'cz' ? 'Chyba při generování kódu' : 'Failed to generate code', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const referralLink = stats.referralCode ? `https://nexus-hub.app/register?ref=${stats.referralCode}` : null;

  const cz = lang === 'cz';

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <div style={{ marginBottom: isMobile ? '1.5rem' : '3rem' }}>
        <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('referralProgram')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>{t('referralsSubtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '2rem' : '3rem' }}>
        {[
          { label: (cz ? 'REGISTRACE' : 'SIGNUPS'), value: stats.totalSignups, icon: UserPlus, color: '#10b981' },
          { label: (cz ? 'POTVRZENO' : 'CONFIRMED'), value: stats.confirmed, icon: Check, color: '#3b82f6' },
          { label: (cz ? 'VYDĚLÁNO' : 'EARNED'), value: `€${stats.totalEarned}`, icon: Trophy, color: '#f59e0b' },
          { label: (cz ? 'ČEKAJÍCÍ' : 'PENDING'), value: `€${stats.pendingEarned}`, icon: Clock, color: 'var(--text-secondary)' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: isMobile ? '1.15rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <stat.icon size={16} color={stat.color} />
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '900' }}>{isLoading ? '...' : stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', marginBottom: '3rem' }}>
        {/* Referral Link / Code */}
        <div className="glass-card" style={{ flex: 1, padding: isMobile ? '1.5rem' : '2rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link size={20} color="#f59e0b" /> {t('referralLinkHeader')}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {t('referralLinkDesc')}
          </p>

          {stats.referralCode ? (
            <>
              {/* Referral Code */}
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  {cz ? 'VÁŠ KÓD' : 'YOUR CODE'}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)', fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '900', color: '#f59e0b', textAlign: 'center', letterSpacing: '0.1em' }}>
                    {stats.referralCode}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(stats.referralCode).then(() => showToast(cz ? 'Kód zkopírován ✓' : 'Code copied ✓', 'success'))}
                    className="action-btn"
                    style={{ width: 'auto', padding: '0 1.25rem', marginTop: 0, background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
              {/* Referral Link */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  {cz ? 'ODKAZ' : 'LINK'}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--card-border)', fontFamily: 'monospace', fontSize: '0.8rem', color: '#f59e0b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {referralLink}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(referralLink).then(() => showToast(cz ? 'Odkaz zkopírován ✓' : 'Link copied ✓', 'success'))}
                    className="action-btn"
                    style={{ width: 'auto', padding: '0 1.25rem', marginTop: 0, background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button onClick={handleGenerateCode} disabled={isGenerating} className="action-btn" style={{ width: '100%', padding: '1rem', fontSize: '1rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              {isGenerating ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
              {cz ? 'Vygenerovat referral kód' : 'Generate Referral Code'}
            </button>
          )}
        </div>

        {/* Why Refer */}
        <div className="glass-card" style={{ width: isMobile ? '100%' : '400px', padding: isMobile ? '1.5rem' : '2rem' }}>
          <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('whyRefer')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { title: cz ? 'Bonus za registraci' : 'Registration Bonus', desc: cz ? 'Získejte odměnu za každou registrovanou agenturu' : 'Earn a reward for every registered agency' },
              { title: cz ? 'Vzájemné výhody' : 'Mutual Benefits', desc: cz ? 'Obě agentury získají prémiové funkce' : 'Both agencies get premium features' },
              { title: cz ? 'Bez limitu' : 'No Limit', desc: cz ? 'Doporučte kolik agentur chcete' : 'Refer as many agencies as you want' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={18} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral History */}
      {stats.referrals.length > 0 && (
        <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
          <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="#3b82f6" /> {cz ? 'Historie doporučení' : 'Referral History'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.referrals.map(ref => (
              <div key={ref.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{ref.agencyName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {new Date(ref.createdAt).toLocaleDateString(cz ? 'cs-CZ' : 'en-GB')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {ref.rewardAmount > 0 && (
                    <span style={{ fontWeight: '900', color: '#f59e0b' }}>€{ref.rewardAmount}</span>
                  )}
                  <span style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800',
                    background: ref.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: ref.status === 'confirmed' ? '#10b981' : '#f59e0b'
                  }}>
                    {ref.status === 'confirmed' ? (cz ? 'Potvrzeno' : 'Confirmed') : (cz ? 'Čekající' : 'Pending')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralsView;
