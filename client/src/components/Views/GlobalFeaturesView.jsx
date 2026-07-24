/* src/components/Views/GlobalFeaturesView.jsx */
import React from 'react';
import { Zap, Cpu, Check, Shield, Loader2, Lock, Unlock } from 'lucide-react';

import { useNexus } from '../../context/ContextHook';

const GlobalFeaturesView = () => {
  const nexus = useNexus();
  const {
    t,
    lang,
    isMobile,
    isAppOwner,
    loading,
    globalFeatures = [],
    globalSettings = [],
    handleFeatureToggle: onFeatureToggle,
    isTraining,
    trainingProgress,
    onStartTraining,
    onResetTraining,
    handleUpdateGlobalSetting,
    featureLocks = {},
    lockableFeatures = [],
    handleFeatureLockToggle
  } = nexus;

  const isCz = lang === 'cz' || lang === 'cs';

  if (loading) {
    return (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinning" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (!isAppOwner) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
        <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
        <p>{t('app_owner_only')}</p>
      </div>
    );
  }

  return (
    <div data-testid="page-global-features-container" style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {t('featuresTitle')}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Zámky nedodělaných / neověřených funkcí */}
        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Lock size={22} color="#3b82f6" /> {isCz ? 'Zámky funkcí' : 'Feature Locks'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
            {isCz
              ? 'Nedodělané nebo neověřené funkce drž zamčené — uživatelům se ukáže hláška a reálné chování je vypnuté. Odemkni je, až je ověříš. Ty (App Owner) je vidíš odemčené i tak, abys je mohl otestovat.'
              : 'Keep unfinished or unverified features locked — users see a notice and the real behavior is disabled. Unlock them once verified. You (App Owner) always see them unlocked so you can test.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lockableFeatures.map((feature) => {
              const locked = featureLocks[feature.key] !== undefined ? featureLocks[feature.key] : true;
              return (
                <div key={feature.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {feature.title}
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.04em', padding: '0.15rem 0.5rem', borderRadius: '999px',
                        background: locked ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: locked ? '#f87171' : '#4ade80'
                      }}>
                        {locked ? (isCz ? '🔒 ZAMČENO' : '🔒 LOCKED') : (isCz ? '✅ DOSTUPNÉ' : '✅ AVAILABLE')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{feature.note}</div>
                    <code style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{feature.key}</code>
                  </div>
                  <button
                    onClick={() => handleFeatureLockToggle && handleFeatureLockToggle(feature.key, !locked)}
                    aria-label={locked ? (isCz ? 'Odemknout' : 'Unlock') : (isCz ? 'Zamknout' : 'Lock')}
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                      border: 'none', borderRadius: '10px', padding: '0.55rem 0.9rem', fontSize: '0.72rem', fontWeight: 800,
                      background: locked ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                      color: locked ? '#4ade80' : '#f87171'
                    }}
                  >
                    {locked ? <Unlock size={14} /> : <Lock size={14} />}
                    {locked ? (isCz ? 'Odemknout' : 'Unlock') : (isCz ? 'Zamknout' : 'Lock')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem', border: '1px dashed var(--accent-color)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <Zap size={24} color="#f59e0b" /> {t('masterFeatureProvisioning')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem' }}>
            {(globalFeatures || []).map((feature, i) => (
              <div key={feature.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>{t(`feat_${feature.id}`) || feature.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t(`feat_${feature.id}_desc`) || feature.desc}</div>
                </div>
                <div 
                  onClick={() => onFeatureToggle(feature, i)}
                  className={`toggle-switch ${feature.active ? 'active' : ''}`}
                  style={{ width: '40px', height: '20px', background: feature.active ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', cursor: 'pointer', position: 'relative' }}
                >
                  <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: feature.active ? '23px' : '3px', transition: 'all 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem', background: 'rgba(139, 92, 246, 0.05)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Cpu size={24} color="#a855f7" /> {t('aiTrainingEngine')}
          </h3>
          {trainingProgress === 100 ? (
            <div style={{ textAlign: 'center' }}>
              <Check size={48} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
              <h4>{t('modelOptimizationComplete')}</h4>
              <button onClick={onResetTraining} className="status-badge" style={{ marginTop: '1rem' }}>{t('trainingReset')}</button>
            </div>
          ) : (
            <button onClick={onStartTraining} disabled={isTraining} className="action-btn" style={{ background: 'var(--accent-color)' }}>
              {isTraining ? `${t('trainingInProgress')} ${trainingProgress}%` : t('uploadTrainingSet')}
            </button>
          )}
        </div>

        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={24} color="#ef4444" /> {t('systemParameters')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { key: 'referral_reward_base', label: t('baseReferralReward'), type: 'number' },
              { key: 'referral_currency', label: t('referralCurrency'), type: 'text' }
            ].map((param) => (
              <div key={param.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{param.label}</div>
                  <code style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{param.key}</code>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type={param.type}
                    defaultValue={globalSettings?.find(s => s.key === param.key)?.value || ''}
                    id={`param-${param.key}`}
                    style={{ width: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'white', padding: '0.4rem 0.75rem', fontSize: '0.9rem', fontWeight: '700' }}
                  />
                  <button 
                    onClick={async () => {
                      const val = document.getElementById(`param-${param.key}`).value;
                      await handleUpdateGlobalSetting(param.key, val);
                    }}
                    style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    {t('save').toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalFeaturesView;
