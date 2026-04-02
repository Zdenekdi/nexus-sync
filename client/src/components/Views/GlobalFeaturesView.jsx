/* src/components/Views/GlobalFeaturesView.jsx */
import React from 'react';
import { Zap, Cpu, Check } from 'lucide-react';

import { useNexus } from '../../context/NexusContext';

const GlobalFeaturesView = () => {
  const nexus = useNexus();
  const { 
    t, 
    lang, 
    isMobile, 
    globalFeatures, 
    handleFeatureToggle: onFeatureToggle, 
    isTraining, 
    trainingProgress, 
    onStartTraining, 
    onResetTraining 
  } = nexus;
  return (
    <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {t('featuresTitle')}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div className="glass-card" style={{ padding: '2rem', border: '1px dashed var(--accent-color)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <Zap size={24} color="#f59e0b" /> {t('masterFeatureProvisioning')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem' }}>
            {globalFeatures.map((feature, i) => (
              <div key={feature.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>{feature.label || feature.id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feature.desc}</div>
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
              <button onClick={onResetTraining} className="status-badge" style={{ marginTop: '1rem' }}>RESET</button>
            </div>
          ) : (
            <button onClick={onStartTraining} disabled={isTraining} className="action-btn" style={{ background: 'var(--accent-color)' }}>
              {isTraining ? `TRAINING ${trainingProgress}%` : t('uploadTrainingSet')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalFeaturesView;
