import React, { useState, useEffect, useContext } from 'react';
import { CreditCard, Users, Check, FileEdit, CheckCheck, Zap, RefreshCw, AlertCircle } from 'lucide-react';

import { NexusContext } from '../context/NexusContext';

const PlansDashboard = () => {
  const { t, activeOperator, subscriptionPlans, fetchPlans, updatePlans, isPlansLoading, activeMarket, setActiveMarket, agencies, isMobile } = useContext(NexusContext);
  const currentAgency = agencies[0];
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    if (activeOperator?.role === 'APP OWNER') {
      fetchPlans();
    }
  }, [activeOperator]);

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
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                background: activeMarket === market ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                color: activeMarket === market ? '#60a5fa' : 'var(--text-secondary)',
                border: activeMarket === market ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeMarket === market ? '0 0 15px rgba(59, 130, 246, 0.25)' : 'none',
                transform: activeMarket === market ? 'translateY(-2px)' : 'translateY(0)'
              }}
            >
              {market.toUpperCase()} ({getCurrencySymbol(market)})
            </button>
          ))}
        </div>
      </div>
      
      {isPlansLoading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={32} style={{ marginBottom: '1rem' }} />
          <div>Načítám tarify z databáze...</div>
        </div>
      )}

      {(!isPlansLoading && (!subscriptionPlans || subscriptionPlans.length === 0)) && (
        <div style={{ padding: '3rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '2.5rem', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <AlertCircle size={40} style={{ marginBottom: '1.2rem', color: '#f87171' }} />
          <h3 style={{ color: '#f87171', marginBottom: '0.75rem', fontWeight: '800' }}>Tarify nejsou dostupné</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', marginInline: 'auto' }}>Pravděpodobně došlo k chybě v napojení na databázi nebo vypršel přihlašovací token. Zkuste stránku obnovit.</p>
          
          {activeOperator?.role === 'APP OWNER' && (
            <button 
              onClick={async () => {
                const defaultPlans = [
                  { id: 'basic', name: 'Basic', prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 3, features: ['Správa profilů', 'Základní analytika', 'Podpora 24/7'] },
                  { id: 'pro', name: 'Pro', prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10, features: ['Vše z Basic', 'Pokročilá analytika', 'AI Optimalizace'] },
                  { id: 'agency', name: 'Agency', prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 50, features: ['Vše z Pro', 'Auditní logy', 'API Přístup'] }
                ];
                const result = await updatePlans(defaultPlans);
                if (result.success) {
                  alert('Tarify byly úspěšně inicializovány. Stránka se nyní aktualizuje.');
                  fetchPlans();
                } else {
                  alert('CHYBA ZE SERVERU: ' + result.error);
                }
              }}
              style={{ padding: '1rem 2rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)' }}
            >
              INICIALIZOVAT VÝCHOZÍ TARIFY
            </button>
          )}
        </div>
      )}
      
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
                    <div style={{ display: 'flex', alignItems: baseline ? 'baseline' : 'center', gap: '0.4rem' }}>
                      <div style={{ fontSize: '1.25rem', color: 'var(--accent-color)', fontWeight: '800' }}>
                        {plan.prices?.[activeMarket.toLowerCase()] || '0'} {getCurrencySymbol(activeMarket)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {activeMarket === 'cz' ? (plan.prices?.eu || '0') : (plan.prices?.cz || '0')}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={24} color="#6366f1" />
                  </div>
                </div>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>{plan.description || t('noPlanDesc')}</p>
                
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
              
              {activeOperator?.role === 'APP OWNER' ? (
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
            { id: 'senior-op', name: 'Role: Senior Operator', prices: { cz: '500', eu: '20', us: '25', uk: '18' }, desc: t('seniorOpDesc') || 'Pokročilé řízení práv a dohled nad týmem.' },
            { id: 'ai-opt', name: 'AI Optimizer Pack', prices: { cz: '1200', eu: '48', us: '55', uk: '42' }, desc: t('aiOptDesc') || 'Automatická optimalizace kampaní přes AI.' },
            { id: 'vip-supp', name: 'Priority VIP Support', prices: { cz: '2000', eu: '80', us: '90', uk: '70' }, desc: t('vipSuppDesc') || 'Garantovaná podpora do 2 hodin.' }
          ].map(addon => (
            <div key={addon.id} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s' }}>
              <div style={{ fontWeight: '800', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{addon.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>{addon.desc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-color)', fontWeight: '800' }}>
                  {addon.prices[activeMarket.toLowerCase()]} {getCurrencySymbol(activeMarket)}
                </span>
                <button 
                  onClick={() => activeOperator?.role === 'APP OWNER' ? setEditingPlan({ ...addon, prices: addon.prices, isAddon: true }) : alert('Platba bude integrována via GoPay.')}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: activeOperator?.role === 'APP OWNER' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)', 
                    border: activeOperator?.role === 'APP OWNER' ? '1px solid #fbbf24' : '1px solid var(--accent-color)', 
                    borderRadius: '8px', color: 'white', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' 
                  }}>
                  {activeOperator?.role === 'APP OWNER' ? 'NASTAVIT' : 'AKTIVOVAT'}
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

              {!editingPlan.isAddon && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>VLASTNOSTI (ODDĚLENÉ ČÁRKOU)</label>
                  <textarea 
                    className="glass-input" 
                    value={(editingPlan.features || []).join(', ')} 
                    onChange={(e) => setEditingPlan({...editingPlan, features: e.target.value.split(',').map(f => f.trim()).filter(f => f.length > 0)})} 
                    style={{ width: '100%', padding: '0.75rem', minHeight: '100px', resize: 'vertical' }} 
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="action-btn" 
                  style={{ flex: 1, background: 'var(--accent-color)' }} 
                  onClick={async () => {
                    const newPlans = subscriptionPlans.map(p => p.id === editingPlan.id ? editingPlan : p);
                    const success = await updatePlans(newPlans);
                    if (success) {
                      setEditingPlan(null);
                    } else {
                      alert('Chyba při ukládání do DB.');
                    }
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
