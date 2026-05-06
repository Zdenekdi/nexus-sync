/* src/components/Views/GlobalFeaturesView.jsx */
import React from 'react';
import { Zap, Cpu, Check, Shield, Loader2 } from 'lucide-react';

import { useNexus } from '../../context/ContextHook';

const GlobalFeaturesView = () => {
  const nexus = useNexus();
  const { 
    t, 
    _lang, 
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
    handleUpdateGlobalSetting
  } = nexus;

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
