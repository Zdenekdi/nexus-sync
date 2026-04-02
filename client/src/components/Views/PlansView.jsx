/* src/components/Views/PlansView.jsx */
import React from 'react';
import { CreditCard, Check } from 'lucide-react';

import { useNexus } from '../../context/NexusContext';

const PlansView = () => {
  const nexus = useNexus();
  const { 
    t, 
    lang, 
    isMobile, 
    activeSubscription, 
    subscriptionHistory, 
    isStartingSubscription, 
    onStartSubscription, 
    onCancelSubscription,
    daysLeft 
  } = nexus;
  const PLANS = [
    { id: 'MONTHLY',     label: lang === 'cz' ? 'Měsíční'  : 'Monthly',     priceFmt: '990 Kč',    days: 30 },
    { id: 'SEMI_ANNUAL', label: lang === 'cz' ? 'Půlroční' : 'Semi-Annual', priceFmt: '5 490 Kč',  days: 182 },
    { id: 'ANNUAL',      label: lang === 'cz' ? 'Roční'    : 'Annual',      priceFmt: '9 990 Kč',  days: 365 },
  ];

  const statusColor = !activeSubscription ? '#6b7280' : activeSubscription.status === 'ACTIVE' ? '#10b981' : '#f59e0b';

  return (
    <div className="fade-in" style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Status Card */}
        <div className="glass-card" style={{ padding: '2rem', borderTop: `3px solid ${statusColor}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CURRENT PLAN</div>
              {activeSubscription ? (
                <>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>{activeSubscription.plan}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {lang === 'cz' ? 'Vyprší za' : 'Expires in'} {daysLeft} {lang === 'cz' ? 'dní' : 'days'}
                  </div>
                </>
              ) : <div style={{ color: 'var(--text-secondary)' }}>No active subscription</div>}
            </div>
            {activeSubscription && (
              <button onClick={onCancelSubscription} className="status-badge" style={{ color: '#ef4444', borderColor: '#ef4444' }}>CANCEL</button>
            )}
          </div>
        </div>

        {/* Plan Picker */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
          {PLANS.map(plan => (
            <div key={plan.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>{plan.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-color)' }}>{plan.priceFmt}</div>
              <button 
                onClick={() => onStartSubscription(plan.id)} 
                disabled={isStartingSubscription}
                className="action-btn"
                style={{ background: 'var(--accent-color)', color: 'white', marginTop: 'auto' }}
              >
                {t('subscribe')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansView;
