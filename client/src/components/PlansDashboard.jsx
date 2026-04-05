import React from 'react';
import { CreditCard, Users, Check, FileEdit, CheckCheck, Zap } from 'lucide-react';

import { useNexus } from '../context/NexusContext';

const PlansDashboard = () => {
  const nexus = useNexus();
  const { 
    t, 
    lang: _lang, 
    plans: subscriptionPlans, 
    setPlans: setSubscriptionPlans, 
    activeMarket, 
    setActiveMarket, 
    activeOperator, 
    agencies,
    isMobile
  } = nexus;
  const currentAgency = agencies[0];
  const [editingPlan, setEditingPlan] = React.useState(null);

  const getCurrencySymbol = (m) => {
    switch(m.toLowerCase()) {
      case 'cz': return 'Kč';
      case 'eu': return '€';
      case 'uk': return '£';
      case 'us': return '$';
      default: return '€';
    }
  };

  return (
    <div style={{ padding: isMobile ? 'calc(1rem + env(safe-area-inset-left)) 1rem calc(1rem + max(env(safe-area-inset-bottom), 1rem) + env(safe-area-inset-right))' : '2rem', flex: 1, overflowY: isMobile ? 'scroll' : 'auto', maxHeight: isMobile ? 'calc(100dvh - max(env(safe-area-inset-top), 1rem) - 3rem)' : '100%' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: isMobile ? '2rem' : '3rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('subscriptionPlansTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.9rem' : '1.1rem', margin: 0 }}>{t('subscriptionPlansSubtitle')}</p>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '0.5rem', display: 'flex', gap: '0.25rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          {['cz', 'eu', 'uk', 'us'].map(market => (
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
              {market.toUpperCase()} ({getCurrencySymbol(market)})
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
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <div style={{ fontSize: '1.25rem', color: 'var(--accent-color)', fontWeight: '800' }}>
                        {plan.prices[activeMarket.toLowerCase()]}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {activeMarket === 'cz' ? plan.prices.eu : (activeMarket === 'uk' ? plan.prices.eu : plan.prices.cz)}
                      </div>
                    </div>
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
                        <span>{t(feat)}</span>
                      </div>
                    ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <Users size={14} color="var(--accent-color)" />
                    <span>{t('profilesLimitLabel', { count: plan.profilesLimit })}</span>
                  </div>
                </div>
              </div>
              
              {activeOperator?.role === 'App Owner' ? (
                <button 
                  onClick={() => setEditingPlan(plan)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <FileEdit size={16} /> {t('editPlanDetails') || 'Upravit tarif'}
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

      {/* ADD-ON MARKETPLACE */}
      <div style={{ marginTop: '4rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={24} color="var(--accent-color)" /> {t('addOnMarketplaceTitle') || 'Doplňkové funkce & Role'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { id: 'role_senior_operator', name: 'Role: Senior Operator', price: '500 CZK', desc: 'Pokročilé řízení práv a dohled nad týmem.' },
            { id: 'mod_ai_optimizer', name: 'AI Optimizer Pack', price: '1200 CZK', desc: 'Automatická optimalizace kampaní přes AI.' },
            { id: 'feat_priority_support', name: 'Priority VIP Support', price: '2000 CZK', desc: 'Garantovaná podpora do 2 hodin.' }
          ].map(addon => (
            <div key={addon.id} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s' }}>
              <div style={{ fontWeight: '800', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{addon.name}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{addon.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-color)', fontWeight: '800' }}>{addon.price}</span>
                <button 
                  onClick={() => alert('Platba bude integrována via GoPay.')}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-color)', borderRadius: '8px', color: 'white', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                  AKTIVOVAT
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Plan Editor Modal */}
      {editingPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', border: '1px solid var(--accent-color)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' }}>Upravit tarif: {editingPlan.name}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>NÁZEV TARIFU</label>
                <input className="glass-input" value={editingPlan.name} onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})} style={{ width: '100%', padding: '0.75rem' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CENA CZK</label>
                  <input className="glass-input" value={editingPlan.prices.cz} onChange={(e) => setEditingPlan({...editingPlan, prices: {...editingPlan.prices, cz: e.target.value}})} style={{ width: '100%', padding: '0.75rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CENA USD</label>
                   <input className="glass-input" value={editingPlan.prices.us} onChange={(e) => setEditingPlan({...editingPlan, prices: {...editingPlan.prices, us: e.target.value}})} style={{ width: '100%', padding: '0.75rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>LIMIT PROFILŮ</label>
                <input type="number" className="glass-input" value={editingPlan.profilesLimit} onChange={(e) => setEditingPlan({...editingPlan, profilesLimit: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.75rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="action-btn" 
                  style={{ flex: 1, background: 'var(--accent-color)' }} 
                  onClick={() => {
                    const newPlans = subscriptionPlans.map(p => p.id === editingPlan.id ? editingPlan : p);
                    setSubscriptionPlans(newPlans);
                    setEditingPlan(null);
                  }}
                >
                  ULOŽIT ZMĚNY
                </button>
                <button className="action-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' }} onClick={() => setEditingPlan(null)}>ZRUŠIT</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansDashboard;
