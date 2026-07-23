import React from 'react';
import * as tokenStore from '../../services/tokenStore';
import { Smartphone, Download, Zap } from 'lucide-react';

import { useNexus } from '../../context/ContextHook';
import FeatureLock from '../FeatureLock';

const DeviceSetupView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    API_BASE,
    lang = 'cz'
  } = nexus;
  const [relayApkInfo, setRelayApkInfo] = React.useState(null);
  const [isApkInfoLoading, setIsApkInfoLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchRelayApkInfo = async () => {
      try {
        setIsApkInfoLoading(true);
        const token = tokenStore.getToken();
        const r = await fetch(`${API_BASE}/vultr/apk-info?type=relay`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const d = await r.json();
        if (!cancelled) setRelayApkInfo(d?.available ? d : null);
      } catch {
        if (!cancelled) setRelayApkInfo(null);
      } finally {
        if (!cancelled) setIsApkInfoLoading(false);
      }
    };

    if (API_BASE) fetchRelayApkInfo();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]);

  const relayDownloadUrl = relayApkInfo?.downloadUrl || `${API_BASE}/vultr/download-relay.apk`;
  const relayVersionLabel = relayApkInfo?.version
    ? ` (v${relayApkInfo.version})`
    : isApkInfoLoading
      ? ` (${lang === 'cz' ? 'ověřuji verzi...' : 'checking version...'})`
      : '';
  const activeTracker = nexus.linkedTracker || null;
  const [trackerImei, setTrackerImei] = React.useState('');
  const [trackerProfileId, setTrackerProfileId] = React.useState(() => (
    nexus.activeProfileId && nexus.activeProfileId !== 'all' ? nexus.activeProfileId : ''
  ));

  React.useEffect(() => {
    if (nexus.activeProfileId && nexus.activeProfileId !== 'all') {
      setTrackerProfileId(nexus.activeProfileId);
    }
  }, [nexus.activeProfileId]);

  return (
    <div data-testid="page-device-setup-container" style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
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
              href={relayDownloadUrl} 
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
            >
              <Download size={20} /> {t('downloadApp')}{relayVersionLabel}
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

        {/* External GPS Tracker Setup */}
        <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem', border: activeTracker ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={24} color="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.25rem' }}>{nexus.lang === 'cz' ? 'Externí GPS Tracker' : 'External GPS Tracker'}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {nexus.lang === 'cz' ? 'Spárujte svůj hardwarový tracker pro nezávislé sledování polohy.' : 'Pair your hardware tracker for independent location tracking.'}
                  </p>
                </div>
              </div>

              {!activeTracker ? (
                <FeatureLock featureKey="physical-tracker">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr minmax(180px, 240px) auto', gap: '0.75rem' }}>
                  <input 
                    id="tracker-imei-input"
                    type="text" 
                    placeholder="IMEI / ID zařízení" 
                    value={trackerImei}
                    onChange={(e) => setTrackerImei(e.target.value)}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white' }}
                  />
                  <select
                    value={trackerProfileId}
                    onChange={(e) => setTrackerProfileId(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'white' }}
                  >
                    <option value="">{nexus.lang === 'cz' ? 'Bez profilu' : 'No profile'}</option>
                    {(nexus.profiles || []).map(profile => (
                      <option key={profile.id} value={profile.id}>{profile.name}</option>
                    ))}
                  </select>
                  <button 
                    className="action-btn"
                    disabled={!trackerImei.trim() || nexus.isPairingTracker}
                    style={{ background: 'var(--accent-color)', color: 'white', fontWeight: 800, padding: '0 1.5rem', borderRadius: '10px', opacity: !trackerImei.trim() || nexus.isPairingTracker ? 0.55 : 1 }}
                    onClick={() => {
                      if (trackerImei.trim()) {
                        nexus.handlePairTracker(trackerImei, { profileId: trackerProfileId || null });
                      }
                    }}
                  >
                    {nexus.isPairingTracker ? (nexus.lang === 'cz' ? 'Páruji...' : 'Pairing...') : (nexus.lang === 'cz' ? 'Spárovat' : 'Pair')}
                  </button>
                </div>
                </FeatureLock>
              ) : (
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 700 }}>
                      ID: {activeTracker.imei || activeTracker.id}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 800, textTransform: 'uppercase' }}>{nexus.lang === 'cz' ? 'Spárováno' : 'Synced'}</span>
                    {activeTracker.lastSeenAt && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(activeTracker.lastSeenAt).toLocaleString(nexus.lang === 'cz' ? 'cs-CZ' : 'en-GB')}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => nexus.handleUnpairTracker(activeTracker.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {nexus.lang === 'cz' ? 'Odpojit' : 'Unpair'}
                  </button>
                </div>
              )}

              {nexus.trackerProvisioning && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.25)', background: 'rgba(59,130,246,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                    {nexus.lang === 'cz' ? 'Jednorázové nastavení trackeru' : 'One-time tracker provisioning'}
                  </div>
                  <code style={{ display: 'block', wordBreak: 'break-all', color: 'white', background: 'rgba(0,0,0,0.28)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                    {nexus.trackerProvisioning.url}
                  </code>
                  <code style={{ display: 'block', wordBreak: 'break-all', color: '#fbbf24', background: 'rgba(0,0,0,0.28)', padding: '0.75rem', borderRadius: '8px' }}>
                    {nexus.trackerProvisioning.token}
                  </code>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.6rem' }}>
                    {nexus.lang === 'cz' ? 'Token se z bezpečnostních důvodů zobrazuje jen po vytvoření nebo rotaci.' : 'For security, the token is shown only after creation or rotation.'}
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: isMobile ? '100%' : '300px', padding: '1.25rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                {nexus.lang === 'cz' ? 'Jak to funguje?' : 'How it works?'}
              </div>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>{nexus.lang === 'cz' ? 'Zadejte IMEI číslo ze štítku zařízení.' : 'Enter the IMEI number from the device label.'}</li>
                <li>{nexus.lang === 'cz' ? 'Systém začne přijímat GPRMC data z trackeru.' : 'System will start receiving GPRMC data from the tracker.'}</li>
                <li>{nexus.lang === 'cz' ? 'V případě SOS bude poloha brána primárně z tohoto zařízení.' : 'In case of SOS, location will be primary taken from this device.'}</li>
              </ul>
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
