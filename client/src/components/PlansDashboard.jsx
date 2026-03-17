import React from 'react';
import { CreditCard, Users, Check, FileEdit, CheckCheck, Zap } from 'lucide-react';

const PlansDashboard = ({ t, subscriptionPlans, activeMarket, setActiveMarket, activeOperator, currentAgency }) => {
  const isMobile = window.innerWidth < 768;
  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: isMobile ? '2rem' : '3rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('subscriptionPlansTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem', margin: 0 }}>{t('subscriptionPlansSubtitle')}</p>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', gap: '0.25rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          {['EU', 'UK', 'CZ'].map(market => (
            <button
              key={market}
              onClick={() => setActiveMarket(market)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: activeMarket === market ? 'var(--accent-color)' : 'transparent',
                color: activeMarket === market ? 'white' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {market === 'CZ' ? 'CZ (Kč)' : market === 'UK' ? 'UK (£)' : 'EU (€)'}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: isMobile ? '1rem' : '2rem' }}>
        {(subscriptionPlans || []).map((plan) => {
          const isActive = currentAgency?.tier?.toLowerCase() === plan.id;
          
          return (
            <div 
              key={plan.id} 
              className="glass-card" 
              style={{ 
                padding: '2rem', 
                border: isActive ? '2px solid var(--accent-color)' : '1px solid rgba(139, 92, 246, 0.2)',
                position: 'relative',
                transform: isActive ? 'scale(1.02)' : 'none',
                zIndex: isActive ? 1 : 0,
                boxShadow: isActive ? '0 0 30px rgba(99, 102, 241, 0.2)' : 'none'
              }}
            >
              {isActive && (
                <div style={{ 
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent-color)', color: 'white', padding: '0.25rem 0.75rem',
                  borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.05em'
                }}>
                  {t('currentPlan')}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>{plan.name}</h3>
                  <div style={{ fontSize: '1.25rem', color: 'var(--accent-color)', fontWeight: '700' }}>{plan.prices ? plan.prices[activeMarket] : 'N/A'}</div>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={24} color="#6366f1" />
                </div>
              </div>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>{plan.description}</p>
              
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.1em' }}>{t('includedFeatures')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(plan.features || []).map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <Check size={14} color="var(--success-color)" />
                      <span>{feat}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <Users size={14} color="var(--accent-color)" />
                    <span>{t('profilesLimitLabel', { count: plan.profilesLimit })}</span>
                  </div>
                </div>
              </div>
              
              {activeOperator?.isSuperAdmin ? (
                <button 
                  onClick={() => {}} // Simulation only
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <FileEdit size={16} /> {t('editPlanDetails')}
                </button>
              ) : (
                <button 
                  onClick={() => {}} // Simulation only
                  disabled={isActive}
                  style={{ 
                    width: '100%', padding: '0.8rem', 
                    background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--accent-color)', 
                    border: isActive ? '1px solid var(--success-color)' : 'none', 
                    borderRadius: '10px', color: 'white', fontWeight: '800', 
                    cursor: isActive ? 'default' : 'pointer', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', gap: '0.5rem',
                    boxShadow: isActive ? 'none' : '0 10px 20px var(--accent-glow)'
                  }}
                >
                  {isActive ? (
                    <>
                      <CheckCheck size={16} color="var(--success-color)" /> {t('active')}
                    </>
                  ) : (
                    <>
                      <Zap size={16} fill="white" /> {t('upgradeNow')}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlansDashboard;
