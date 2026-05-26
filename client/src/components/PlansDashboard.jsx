import React, { useState, useEffect } from 'react';
import { CreditCard, Users, Check, FileEdit, CheckCheck, Zap, RefreshCw, AlertCircle, Banknote, Package as PackageIcon } from 'lucide-react';

import { useNexus } from '../context/ContextHook';

const PlansDashboard = () => {
  const { t, activeOperator, activeRole, subscriptionPlans, fetchPlans, updatePlans, isPlansLoading, activeMarket, setActiveMarket, agencies, isMobile, showToast, lang } = useNexus();
  const currentAgency = agencies[0];
  const [editingPlan, setEditingPlan] = useState(null);
  
  const showInitialize = activeRole === 'app_owner' && (
    !subscriptionPlans || 
    subscriptionPlans.length === 0 || 
    !subscriptionPlans[0]?.name ||
    !subscriptionPlans[0]?.prices || 
    !subscriptionPlans[0]?.prices?.eu || 
    !subscriptionPlans[0]?.prices?.cz ||
    subscriptionPlans[0]?.prices?.eu === "0" || 
    subscriptionPlans[0]?.prices?.cz === "0"
  );

  useEffect(() => {
    if (activeOperator?.id) {
      fetchPlans();
    }
  }, [activeOperator?.id, fetchPlans]);

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
      
      {isPlansLoading && <div style={{ textAlign: 'center', padding: '3rem' }}><RefreshCw className="spinner" size={40} /></div>}
      
      {(!isPlansLoading && showInitialize) && (
        <div style={{ padding: '3rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: '2.5rem', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <Zap size={40} style={{ marginBottom: '1.2rem', color: 'var(--accent-color)' }} />
          <h3 style={{ color: 'white', marginBottom: '0.75rem', fontWeight: '800' }}>Tarify nejsou inicializovány</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', marginInline: 'auto' }}>Systém nemá definované základní cenové hladiny. Jako App Owner je můžete inicializovat jedním kliknutím.</p>
          
          {activeRole === 'app_owner' && (
            <button 
              onClick={async () => {
                const defaultPlans = [
                  { id: 'basic', name: 'Basic', description: t('basicDesc', 'Ideální pro nezávislé modely a začínající agentury. Zahrnuje základní nástroje pro správu.'), prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 5, features: ['Správa profilů', 'Základní analytika', 'Podpora 24/7'] },
                  { id: 'pro', name: 'Pro', description: t('proDesc', 'Nejlepší volba pro rostoucí týmy. Získejte přístup k pokročilým analytickým nástrojům a AI.'), prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10, features: ['Vše z Basic', 'Pokročilá analytika', 'AI Optimalizace'] },
                  { id: 'agency', name: 'Agency', description: t('agencyDesc', 'Komplexní řešení pro velké agentury s neomezenou škálovatelností a plným přístupem.'), prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 20, features: ['Vše z Pro', 'Auditní logy', 'API Přístup'] }
                ];
                const result = await updatePlans(defaultPlans);
                if (result.success) {
                  showToast(lang === 'cz' ? 'Tarify byly úspěšně inicializovány.' : 'Plans initialized successfully.', 'success');
                  fetchPlans();
                } else {
                  showToast(lang === 'cz' ? 'Nepodařilo se uložit tarify.' : 'Failed to save plans.', 'error');
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
        {(subscriptionPlans || []).map(plan => {
          const agencyPlanName = (currentAgency?.subscription?.plan || currentAgency?.tier || currentAgency?.plan || 'basic').toLowerCase();
          const isActive = agencyPlanName === plan.id.toLowerCase() || agencyPlanName === plan.name.toLowerCase();
          
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
              {isActive && activeRole !== 'App Owner' && (
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
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  {plan.descriptionKey ? t(plan.descriptionKey) : (plan.description || t('noPlanDesc'))}
                </p>
                
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
                    <CheckCheck size={14} color="var(--accent-color)" />
                    <span>{plan.profilesLimit === -1 ? (lang === 'cz' ? 'Neomezený počet profilů' : 'Unlimited profiles') : (t('profilesLimitLabel', { count: plan.profilesLimit }) || 'Až {count} profilů').toString().replace('{count}', plan.profilesLimit)}</span>
                  </div>
                </div>
              </div>
              
              {activeRole === 'app_owner' ? (
                <button 
                  onClick={() => setEditingPlan(plan)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <FileEdit size={16} /> {t('editPlanDetails') || 'Upravit tarif'}
                </button>
              ) : isActive ? null : (
                <button
                  style={{ 
                    width: '100%', padding: '0.8rem', 
                    background: 'var(--accent-color)', 
                    border: 'none', 
                    borderRadius: '10px', color: 'white', fontWeight: '800', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 10px 20px var(--accent-glow)'
                  }}
                >
                  <Zap size={16} fill="white" /> {t('upgradeNow')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ADD-ON MARKETPLACE */}
      <div style={{ marginTop: '4rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={24} color="var(--accent-color)" /> {lang === 'cz' ? 'Doplňkové funkce & Role' : 'Add-on Features & Roles'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { id: 'senior_op', name: 'Role: Senior Operator', desc: t('seniorOpDesc'), icon: Users, prices: { cz: '500', eu: '20', uk: '18', us: '22' } },
            { id: 'ai_opt', name: 'AI Optimizer Pack', desc: t('aiOptDesc'), icon: Zap, prices: { cz: '1200', eu: '48', uk: '42', us: '52' } },
            { id: 'vip_supp', name: 'Priority VIP Support', desc: t('vipSuppDesc'), icon: CheckCheck, prices: { cz: '2000', eu: '80', uk: '70', us: '88' } },
            { id: 'extra_profiles', name: t('extraProfiles'), desc: t('extraProfilesDesc'), icon: PackageIcon, prices: { cz: '250', eu: '10', uk: '9', us: '11' } },
          ].map(addon => (
            <div key={addon.id} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
                  <addon.icon size={20} color="var(--accent-color)" />
                </div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{addon.name}</div>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1.25rem', lineHeight: '1.4', minHeight: '3em' }}>{addon.desc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-color)', fontWeight: '800' }}>
                  {addon.prices[activeMarket.toLowerCase()]} {getCurrencySymbol(activeMarket)}
                </span>
                <button 
                  onClick={() => activeRole === 'app_owner' ? setEditingPlan({ ...addon, isAddon: true }) : showToast(lang === 'cz' ? 'Platba bude integrována přes GoPay.' : 'Payment will be integrated via GoPay.', 'info')}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: activeRole === 'app_owner' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                    border: activeRole === 'app_owner' ? '1px solid #fbbf24' : '1px solid var(--accent-color)', 
                    borderRadius: '8px', color: 'white', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' 
                  }}>
                  {activeRole === 'app_owner' ? 'NASTAVIT' : 'AKTIVOVAT'}
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
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>NÁZEV TARIFU</label>
                <input className="glass-input" value={editingPlan.name} onChange={(_err) => setEditingPlan({...editingPlan, name: _err.target.value})} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: '700', transition: 'all 0.3s ease' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CENA CZK</label>
                  <div style={{ position: 'relative' }}>
                    <input className="glass-input" value={editingPlan.prices.cz} onChange={(_err) => setEditingPlan({...editingPlan, prices: {...editingPlan.prices, cz: _err.target.value}})} style={{ width: '100%', padding: '0.85rem 1rem', paddingRight: '3rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: '700', transition: 'all 0.3s ease' }} />
                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>Kč</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CENA USD</label>
                  <div style={{ position: 'relative' }}>
                    <input className="glass-input" value={editingPlan.prices.us} onChange={(_err) => setEditingPlan({...editingPlan, prices: {...editingPlan.prices, us: _err.target.value}})} style={{ width: '100%', padding: '0.85rem 1rem', paddingRight: '2.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: '700', transition: 'all 0.3s ease' }} />
                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem' }}>$</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>LIMIT PROFILŮ</label>
                <select 
                  className="glass-input custom-select" 
                  value={editingPlan.profilesLimit ?? -1} 
                  onChange={(_err) => setEditingPlan({...editingPlan, profilesLimit: parseInt(_err.target.value)})} 
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: '700', appearance: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num} style={{ background: '#0f172a' }}>
                      {num} {num === 1 ? 'profil' : (num > 1 && num < 5 ? 'profily' : 'profilů')}
                    </option>
                  ))}
                  <option value={-1} style={{ background: '#0f172a' }}>Neomezeně profilů</option>
                </select>
              </div>

              {!editingPlan.isAddon && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>OBSAŽENÉ FUNKCIONALITY (CHECKBOXY)</label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                    {[
                      { 
                        title: 'Základ a Dědičnost', 
                        items: ['Vše z Basic', 'Vše z Pro'] 
                      },
                      { 
                        title: 'Správa a Analytika', 
                        items: ['Správa profilů', 'Základní analytika', 'Pokročilá analytika', 'Auditní logy'] 
                      },
                      { 
                        title: 'Rozšířené Systémy', 
                        items: ['AI Optimalizace', 'API Přístup', 'Podpora 24/7', 'VIP Podpora', 'Tvorba Web Profilů'] 
                      }
                    ].map(group => (
                      <div key={group.title}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>{group.title.toUpperCase()}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                          {group.items.map(feat => {
                            const isSelected = (editingPlan.features || []).includes(feat);
                            return (
                              <button 
                                key={feat}
                                onClick={() => {
                                  setEditingPlan(prev => {
                                    const curr = prev.features || [];
                                    if (isSelected) {
                                      return { ...prev, features: curr.filter(f => f !== feat) };
                                    } else {
                                      return { ...prev, features: [...curr, feat] };
                                    }
                                  });
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem',
                                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                  border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.05)',
                                  borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
                                  color: isSelected ? 'white' : 'var(--text-secondary)'
                                }}
                              >
                                <div style={{ 
                                  width: '16px', height: '16px', borderRadius: '4px', 
                                  background: isSelected ? 'var(--accent-color)' : 'rgba(0,0,0,0.3)',
                                  border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? '800' : '600' }}>{feat}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {/* Preserve custom features not in our list */}
                    {(() => {
                      const allKnown = ['Vše z Basic', 'Vše z Pro', 'Správa profilů', 'Základní analytika', 'Pokročilá analytika', 'Auditní logy', 'AI Optimalizace', 'API Přístup', 'Podpora 24/7', 'VIP Podpora', 'Tvorba Web Profilů'];
                      const customFeatures = (editingPlan.features || []).filter(f => !allKnown.includes(f));
                      if (customFeatures.length === 0) return null;
                      return (
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>VLASTNÍ (NEZNÁMÉ) POLOŽKY</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {customFeatures.map(feat => (
                              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--danger-color)', fontSize: '0.8rem', fontWeight: '600' }}>
                                <AlertCircle size={14} /> {feat}
                                <button onClick={() => setEditingPlan(prev => ({...prev, features: prev.features.filter(f => f !== feat)}))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>×</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="action-btn" 
                  style={{ flex: 1, background: 'var(--accent-color)' }} 
                  onClick={async () => {
                    const isAddonEdit = editingPlan.isAddon;
                    const result = await updatePlans(isAddonEdit 
                      ? subscriptionPlans 
                      : subscriptionPlans.map(p => p.id === editingPlan.id ? editingPlan : p)); // Replace logic for addon if needed
                    if (result.success) {
                      setEditingPlan(null);
                      showToast(lang === 'cz' ? 'Změny uloženy.' : 'Changes saved.', 'success');
                    } else {
                      showToast(lang === 'cz' ? 'Nepodařilo se uložit změny.' : 'Failed to save changes.', 'error');
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
