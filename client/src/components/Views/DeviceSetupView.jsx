import React from 'react';
import { Smartphone, Download, Zap } from 'lucide-react';

import { useNexus } from '../../context/NexusContext';

const DeviceSetupView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    relayApkInfo,
    setRelayApkInfo,
    API_BASE
  } = nexus;
  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Smartphone size={isMobile ? 24 : 28} color="var(--accent-color)" /> {t('deviceSetup')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('deviceSetupDesc')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Nexus Relay Setup */}
        <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '1.5rem' : '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
              <div style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={isMobile ? 24 : 32} color="#60a5fa" />
              </div>
              <div>
                <h3 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', marginBottom: '0.25rem' }}>{t('nexusRelayTitle')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('nexusRelayDesc')}</p>
              </div>
            </div>
            
            <a 
              href={relayApkInfo?.available ? relayApkInfo.downloadUrl : `${API_BASE.replace(/\/api$/, '')}/downloads/nexus-relay.apk`} 
              target="_blank"
              rel="noreferrer"
              className="action-btn" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', 
                color: 'white', 
                padding: isMobile ? '0.75rem 1.25rem' : '1rem 2rem', 
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '800',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                fontSize: isMobile ? '0.85rem' : '1rem',
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center'
              }}
              onClick={async (e) => {
                if (!relayApkInfo) {
                  try {
                    const token = localStorage.getItem('nexus_token');
                    const r = await fetch(`${API_BASE}/vultr/apk-info`, { headers: { Authorization: `Bearer ${token}` } });
                    const d = await r.json();
                    setRelayApkInfo(d);
                  } catch {}
                }
              }}
            >
              <Download size={20} /> {t('downloadApp')} (v{relayApkInfo?.version || '0.1'})
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem', borderTop: '1px solid var(--card-border)', paddingTop: '2rem' }}>
             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#60a5fa', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('webhookLabel')}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{t('proxyNote')}</p>
              <code style={{ fontSize: '0.9rem', color: '#60a5fa', wordBreak: 'break-all', display: 'block', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                {`${API_BASE}/device/relay`}
              </code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--accent-color)' }}>{t('relayGuideTitle')}</div>
              {[1, 2, 3, 4, 5, 6].map(step => (
                <div key={step} style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ minWidth: '24px', height: '24px', background: 'rgba(96, 165, 250, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: '#60a5fa' }}>{step}</div>
                  <div style={{ fontSize: '0.9rem' }}>{t(`relayStep${step}`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '2rem', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={20} color="var(--accent-color)" /> {t('whyTheseApps')}
        </h3>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li><strong>{t('safetyLabel')}:</strong> {t('safetyReason')}</li>
          <li><strong>{t('stabilityLabel')}:</strong> {t('stabilityReason')}</li>
          <li><strong>{t('flexibilityLabel')}:</strong> {t('flexibilityReason')}</li>
        </ul>
      </div>
    </div>
  );
};

export default DeviceSetupView;
