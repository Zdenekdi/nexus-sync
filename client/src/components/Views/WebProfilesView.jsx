import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChevronDown, Image, FileEdit, RefreshCw, Check, X, AlertTriangle,
  Type, CreditCard, FileText, Loader2
} from 'lucide-react';

import { useNexus } from '../../context/ContextHook';
import PremiumSelector from '../UI/PremiumSelector';
import FeatureLock from '../FeatureLock';

const parseProfileGallery = (gallery) => {
  if (Array.isArray(gallery)) return gallery;
  if (!gallery) return [];
  try {
    const parsed = JSON.parse(gallery);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getWebProfileText = (profile, language, field, legacyValue = '') => {
  const textData = profile?.data?.webProfileText || {};
  return textData?.[language]?.[field] ?? legacyValue ?? '';
};

const isProtectedGalleryPhotoUrl = (url = '') => /\/api\/profiles\/.+\/gallery\/.+\/file/.test(url);

const WebProfilesView = () => {
  const nexus = useNexus() || {};
  const {
    isMobile = false,
    t = (k) => k,
    lang = 'en',
    activeProfile = null,
    activeProfileId = 'all',
    setActiveProfileId = () => {},
    assignedProfiles = [],
    handleSaveCredentials = () => {},
    isSyncing = false,
    syncStatus = { adultwork: 'idle', amateri: 'idle', onlyfans: 'idle' },
    syncProgress = 0,
    relayOnline = false,
    handleSyncAll = () => {},
    showToast = () => {},
    token = '',
    API_BASE = ''
  } = nexus;
  const activeOperator = nexus.activeOperator || null;
  const [bioLang, setBioLang] = useState(lang?.toUpperCase() === 'CZ' ? 'CZ' : 'EN');
  const [localBios, setLocalBios] = useState({ EN: '', CZ: '' });
  const [localMottos, setLocalMottos] = useState({ EN: '', CZ: '' });
  const [localPricing, setLocalPricing] = useState({ EN: '', CZ: '' });
  const [agentDownloads, setAgentDownloads] = useState([]);
  const [isAgentDownloadsLoading, setIsAgentDownloadsLoading] = useState(false);
  const [agentDownloadsReloadKey, setAgentDownloadsReloadKey] = useState(0);
  const [agentUploadPlatform, setAgentUploadPlatform] = useState('windows');
  const [isAgentUploading, setIsAgentUploading] = useState(false);
  const [localGallery, setLocalGallery] = useState([]);
  const [galleryObjectUrls, setGalleryObjectUrls] = useState({});
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [galleryVisibility, setGalleryVisibility] = useState('public');

  // Sync bioLang with global lang when it changes
  useEffect(() => {
    if (lang) {
      setBioLang(lang.toUpperCase());
    }
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    const fetchAgentDownloads = async () => {
      if (!API_BASE) return;
      try {
        setIsAgentDownloadsLoading(true);
        const { data } = await axios.get(`${API_BASE}/vultr/agent-downloads`);
        if (!cancelled) {
          setAgentDownloads(Array.isArray(data?.downloads) ? data.downloads.filter(item => item.available) : []);
        }
      } catch (_err) {
        if (!cancelled) setAgentDownloads([]);
      } finally {
        if (!cancelled) setIsAgentDownloadsLoading(false);
      }
    };

    fetchAgentDownloads();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, agentDownloadsReloadKey]);

  // Automation states
  const [automationPlatform, setAutomationPlatform] = useState('adultwork');
  const [adsPowerId, setAdsPowerId] = useState('');
  const [platformUser, setPlatformUser] = useState('');
  const [platformPass, setPlatformPass] = useState('');
  const [proxyConfig, setProxyConfig] = useState('');

  // AdultWork Specific Automation Settings
  const [awAutoAvailable, setAwAutoAvailable] = useState(false);
  const [awRotatePhotos, setAwRotatePhotos] = useState(false);
  const [awTweakSummary, setAwTweakSummary] = useState(false);
  const [awAutoLogin, setAwAutoLogin] = useState(false);

  // Update fields when activeProfile changes
  useEffect(() => {
    if (activeProfile) {
      setLocalBios({
        EN: getWebProfileText(activeProfile, 'EN', 'description', activeProfile.description),
        CZ: getWebProfileText(activeProfile, 'CZ', 'description')
      });
      setLocalMottos({
        EN: getWebProfileText(activeProfile, 'EN', 'bio', activeProfile.bio),
        CZ: getWebProfileText(activeProfile, 'CZ', 'bio')
      });
      setLocalPricing({
        EN: getWebProfileText(activeProfile, 'EN', 'pricing'),
        CZ: getWebProfileText(activeProfile, 'CZ', 'pricing')
      });
      setLocalGallery(parseProfileGallery(activeProfile.gallery));
      
      // adsPowerId žije v šifrovaných credentials (načítá se přes getCredentials),
      // ne na Profile — proto při přepnutí profilu jen vyčistíme pole.
      setAdsPowerId('');
      setPlatformUser('');
      setPlatformPass('');
      setProxyConfig('');

      // Load automation settings
      const awSettings = activeProfile.data?.awAutomation || {};
      setAwAutoAvailable(awSettings.autoAvailable || false);
      setAwRotatePhotos(awSettings.rotatePhotos || false);
      setAwTweakSummary(awSettings.tweakSummary || false);
      setAwAutoLogin(awSettings.autoLogin || false);
    }
  }, [activeProfileId, activeProfile]);

  useEffect(() => {
    let cancelled = false;
    const fetchGallery = async () => {
      if (!API_BASE || !token || !activeProfileId || activeProfileId === 'all') {
        setLocalGallery([]);
        return;
      }

      try {
        setIsGalleryLoading(true);
        const { data } = await axios.get(`${API_BASE}/profiles/${activeProfileId}/gallery`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) setLocalGallery(Array.isArray(data?.photos) ? data.photos : []);
      } catch {
        if (!cancelled) setLocalGallery(parseProfileGallery(activeProfile?.gallery));
      } finally {
        if (!cancelled) setIsGalleryLoading(false);
      }
    };

    fetchGallery();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, token, activeProfileId, activeProfile?.gallery]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    const loadGalleryImages = async () => {
      if (!token || localGallery.length === 0) {
        setGalleryObjectUrls({});
        return;
      }

      const entries = await Promise.all(localGallery.map(async (photo) => {
        const key = photo?.id || photo?.url;
        if (!key || !photo?.url) return null;
        if (!isProtectedGalleryPhotoUrl(photo.url)) return [key, photo.url];

        try {
          const { data } = await axios.get(photo.url, {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` }
          });
          const objectUrl = URL.createObjectURL(data);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return null;
          }
          objectUrls.push(objectUrl);
          return [key, objectUrl];
        } catch {
          return [key, ''];
        }
      }));

      if (!cancelled) {
        setGalleryObjectUrls(Object.fromEntries(entries.filter(Boolean)));
      }
    };

    loadGalleryImages();
    return () => {
      cancelled = true;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [localGallery, token]);

  const onSaveBioData = async () => {
    if (!activeProfileId) return;
    try {
      const currentTextData = activeProfile?.data?.webProfileText || {};
      const nextTextData = {
        ...currentTextData,
        [bioLang]: {
          ...(currentTextData[bioLang] || {}),
          description: localBios[bioLang],
          bio: localMottos[bioLang],
          pricing: localPricing[bioLang]
        }
      };

      await axios.patch(`${API_BASE}/profiles/${activeProfileId}`, { 
        description: localBios[bioLang],
        bio: localMottos[bioLang],
        data: {
          ...(activeProfile?.data || {}),
          webProfileText: nextTextData
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(t('saveSuccess'), 'success');
    } catch {
      showToast(t('saveError'), 'error');
    }
  };

  const onSaveAutomation = async () => {
    if (!platformUser || !platformPass) {
      showToast(t('enterUserPass'), 'warning');
      return;
    }

    const credentials = {
      adsPowerId,
      proxy: proxyConfig,
      [automationPlatform]: {
        user: platformUser,
        pass: platformPass
      }
    };

    await handleSaveCredentials(credentials);
  };

  const onToggleAWAutomation = async (type, val) => {
    if (!activeProfileId) return;
    try {
      const currentAW = activeProfile.data?.awAutomation || {};
      const newAW = { ...currentAW, [type]: val };
      
      await axios.patch(`${API_BASE}/profiles/${activeProfileId}`, { 
        data: { ...activeProfile.data, awAutomation: newAW }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (type === 'autoAvailable') setAwAutoAvailable(val);
      if (type === 'rotatePhotos') setAwRotatePhotos(val);
      if (type === 'tweakSummary') setAwTweakSummary(val);
      if (type === 'autoLogin') setAwAutoLogin(val);
      
      showToast(t('saveSuccess'), 'success');
    } catch {
      showToast(t('saveError'), 'error');
    }
  };

  const onStartAWBoost = async () => {
    if (!activeProfileId) return;
    try {
      await axios.post(`${API_BASE}/profiles/${activeProfileId}/boost`, { platform: 'adultwork' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(t('boostStarted'), 'success');
    } catch {
      showToast(t('error'), 'error');
    }
  };

  const onUploadGalleryPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!activeProfileId || activeProfileId === 'all') {
      showToast(lang === 'cz' ? 'Nejdřív vyberte konkrétní profil.' : 'Select a profile first.', 'warning');
      return;
    }

    try {
      setIsGalleryUploading(true);
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('metadata', JSON.stringify({ visibility: galleryVisibility }));

      const { data } = await axios.post(`${API_BASE}/profiles/${activeProfileId}/gallery`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocalGallery(Array.isArray(data?.photos) ? data.photos : []);
      showToast(lang === 'cz' ? 'Fotka byla nahraná do galerie.' : 'Photo uploaded to gallery.', 'success');
    } catch (_err) {
      showToast(_err?.response?.data?.message || (lang === 'cz' ? 'Nahrání fotky se nepovedlo.' : 'Photo upload failed.'), 'error');
    } finally {
      setIsGalleryUploading(false);
    }
  };

  const onDeleteGalleryPhoto = async (photoId) => {
    if (!activeProfileId || activeProfileId === 'all' || !photoId) return;
    try {
      const { data } = await axios.delete(`${API_BASE}/profiles/${activeProfileId}/gallery/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocalGallery(Array.isArray(data?.photos) ? data.photos : []);
      showToast(lang === 'cz' ? 'Fotka byla odstraněná.' : 'Photo removed.', 'success');
    } catch (_err) {
      showToast(_err?.response?.data?.message || (lang === 'cz' ? 'Fotku se nepovedlo odstranit.' : 'Photo removal failed.'), 'error');
    }
  };

  const onUploadAgentPackage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setIsAgentUploading(true);
      const formData = new FormData();
      formData.append('agent', file);
      formData.append('platform', agentUploadPlatform);
      const versionMatch = file.name.match(/v?(\d+(?:\.\d+){1,3})/i);
      if (versionMatch) formData.append('version', versionMatch[1]);

      await axios.post(`${API_BASE}/vultr/upload-agent`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgentDownloadsReloadKey(key => key + 1);
      showToast(lang === 'cz' ? 'Agent balíček byl publikovaný.' : 'Agent package published.', 'success');
    } catch (_err) {
      showToast(_err?.response?.data?.message || (lang === 'cz' ? 'Nahrání agent balíčku se nepovedlo.' : 'Agent package upload failed.'), 'error');
    } finally {
      setIsAgentUploading(false);
    }
  };

  const publicGallery = localGallery.filter(photo => photo.visibility !== 'private');
  const privateGallery = localGallery.filter(photo => photo.visibility === 'private');
  const renderGalleryGrid = (photos, emptyLabel) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
      {photos.length === 0 ? (
        <div style={{ minHeight: '100px', border: '1px dashed var(--card-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center' }}>
          {emptyLabel}
        </div>
      ) : photos.map(photo => {
        const galleryKey = photo.id || photo.url;
        const imageSrc = galleryObjectUrls[galleryKey] || (!isProtectedGalleryPhotoUrl(photo.url) ? photo.url : '');
        return (
          <div key={galleryKey} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.04)' }}>
            {imageSrc ? (
              <img src={imageSrc} alt={photo.caption || 'Profile gallery'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onDeleteGalleryPhoto(photo.id)}
              title={lang === 'cz' ? 'Odstranit fotku' : 'Remove photo'}
              style={{ position: 'absolute', top: '6px', right: '6px', width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.65)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div data-testid="page-web-profiles-container" style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '100%' }} className="fade-in custom-scrollbar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', background: 'linear-gradient(to right, #fff, var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            {activeProfile?.name || '...'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{t('webProfilesDesc')}</p>
        </div>
        
        <div style={{ position: 'relative', width: '240px' }}>
          <PremiumSelector
            options={assignedProfiles}
            value={activeProfileId}
            onChange={(val) => setActiveProfileId(val)}
            placeholder={t('selectProfile')}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
        {/* Left Content Area (Gallery & Bio) */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          {/* SEKCE AUTOMATIZACE A PŘIHLAŠOVACÍ ÚDAJE */}
          <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--accent-color)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)' }}>
            <FeatureLock featureKey="web-automation">
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><RefreshCw size={20} /> {t('automationSettings')}</span>
              <span style={{ 
                fontSize: '0.7rem', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                background: relayOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: relayOnline ? 'var(--success-color)' : 'var(--error-color)',
                border: `1px solid ${relayOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                fontWeight: '800'
              }}>
                {relayOnline ? t('agentOnline') : t('agentOffline')}
              </span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              <div className="input-group-premium">
                <label className="input-label-premium">{t('platform')}</label>
                <select 
                  className="note-input" 
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  value={automationPlatform}
                  onChange={(_err) => setAutomationPlatform(_err.target.value)}
                >
                  <option value="adultwork">Adultwork.com</option>
                  <option value="amateri">Amateri.com</option>
                  <option value="onlyfans">OnlyFans.com</option>
                </select>
              </div>
              <div className="input-group-premium">
                <label className="input-label-premium">AdsPower Profile ID</label>
                <input 
                  type="text" 
                  className="note-input" 
                  placeholder={lang === 'cz' ? "např. j8f2k9l" : "e.g. j8f2k9l"} 
                  value={adsPowerId}
                  onChange={(_err) => setAdsPowerId(_err.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="input-group-premium">
                <label className="input-label-premium">{t('usernameOrEmail')}</label>
                <input 
                  type="text" 
                  className="note-input" 
                  placeholder={lang === 'cz' ? "Login k webu" : "Website login"} 
                  value={platformUser}
                  onChange={(_err) => setPlatformUser(_err.target.value)}
                />
              </div>
              <div className="input-group-premium">
                <label className="input-label-premium">{t('password')}</label>
                <input 
                  type="password" 
                  className="note-input" 
                  placeholder="••••••••" 
                  value={platformPass}
                  onChange={(_err) => setPlatformPass(_err.target.value)}
                />
              </div>
            </div>

            <div className="input-group-premium" style={{ marginTop: '1rem' }}>
              <label className="input-label-premium">{t('proxyServerOptional')}</label>
              <input 
                type="text" 
                className="note-input" 
                placeholder="host:port:user:pass" 
                value={proxyConfig}
                onChange={(_err) => setProxyConfig(_err.target.value)}
              />
            </div>

            <button onClick={onSaveAutomation} className="action-btn" style={{ marginTop: '1.5rem', width: '100%' }}>
              {t('saveAndVerifyConnection')}
            </button>

            {automationPlatform === 'adultwork' && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '15px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: '900' }}>
                  {t('organicBoostStrategy')}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem' }}>{t('autoAvailableToday')}</span>
                    <input type="checkbox" checked={awAutoAvailable} onChange={(e) => onToggleAWAutomation('autoAvailable', e.target.checked)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem' }}>{t('rotateMainPhoto')}</span>
                    <input type="checkbox" checked={awRotatePhotos} onChange={(e) => onToggleAWAutomation('rotatePhotos', e.target.checked)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem' }}>{t('tweakSummary')}</span>
                    <input type="checkbox" checked={awTweakSummary} onChange={(e) => onToggleAWAutomation('tweakSummary', e.target.checked)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem' }}>{t('keepOnline')}</span>
                    <input type="checkbox" checked={awAutoLogin} onChange={(e) => onToggleAWAutomation('autoLogin', e.target.checked)} />
                  </div>
                </div>

                <button 
                  onClick={onStartAWBoost} 
                  className="action-btn" 
                  style={{ 
                    marginTop: '1.25rem', 
                    width: '100%', 
                    background: 'linear-gradient(to right, var(--accent-color), #60a5fa)',
                    fontWeight: '900'
                  }}
                >
                  {t('runOrganicBoostNow')}
                </button>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.75rem', textAlign: 'center', lineHeight: '1.4' }}>
                  {t('organicBoostExplanation')}
                </p>
              </div>
            )}

            {activeOperator?.isAppOwner && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <label className="input-label-premium">{t('relayTokenLabel')}</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'stretch' }}>
                <input 
                  type="password" 
                  readOnly 
                  className="note-input" 
                  style={{ fontSize: '0.7rem', fontFamily: 'monospace', flex: 1 }} 
                  value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                />
                <button 
                  className="action-btn" 
                  style={{ 
                    padding: '0 1.5rem', 
                    background: 'var(--card-bg)', 
                    marginTop: 0, 
                    height: 'auto', 
                    whiteSpace: 'nowrap',
                    border: '1px solid var(--card-border)' 
                  }}
                  onClick={async () => {
                    try {
                      const res = await axios.get(`${API_BASE}/auth/relay-token`, { headers: { Authorization: `Bearer ${token}` } });
                      navigator.clipboard.writeText(res.data.token);
                      showToast(t('tokenCopied') || 'Token copied!', 'success');
                    } catch {
                      showToast(t('tokenError') || 'Error generating token', 'error');
                    }
                  }}
                >
                  {t('copy')}
                </button>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {t('relayTokenNote')}
              </p>
            </div>
            )}
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
              {t('encryptionNote')}
            </p>
            </FeatureLock>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={20} color="var(--accent-color)" /> {t('gallery')}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <select
                  value={galleryVisibility}
                  onChange={(e) => setGalleryVisibility(e.target.value)}
                  className="note-input"
                  style={{ width: 'auto', minWidth: '110px', padding: '0.45rem 0.65rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}
                >
                  <option value="public">{lang === 'cz' ? 'Veřejná' : 'Public'}</option>
                  <option value="private">{lang === 'cz' ? 'Privátní' : 'Private'}</option>
                </select>
                <input type="file" id="photo-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={onUploadGalleryPhoto} />
                <button
                  className="action-btn"
                  disabled={isGalleryUploading || !activeProfile || activeProfileId === 'all'}
                  onClick={() => document.getElementById('photo-upload-input').click()}
                  style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: 0, fontSize: '0.8rem', opacity: isGalleryUploading ? 0.75 : 1 }}
                >
                  {isGalleryUploading ? <Loader2 size={14} className="animate-spin" /> : '+'} {t('uploadPhoto')}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('publicGalleryCap')}</div>
                {isGalleryLoading ? (
                  <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <Loader2 size={16} className="animate-spin" /> {lang === 'cz' ? 'Načítám galerii...' : 'Loading gallery...'}
                  </div>
                ) : renderGalleryGrid(publicGallery, lang === 'cz' ? 'Žádné veřejné fotky' : 'No public photos')}
              </div>
              {!isMobile && <div style={{ width: '1px', background: 'var(--card-border)' }}></div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('privateGalleryCap')} (VIP)</div>
                {isGalleryLoading ? (
                  <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <Loader2 size={16} className="animate-spin" /> {lang === 'cz' ? 'Načítám galerii...' : 'Loading gallery...'}
                  </div>
                ) : renderGalleryGrid(privateGallery, lang === 'cz' ? 'Žádné privátní fotky' : 'No private photos')}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>{t('biographyHeader')}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{t('biographySubtitle')}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                {['EN', 'CZ'].map(l => (
                  <button 
                    key={l}
                    onClick={() => setBioLang(l)} 
                    style={{ 
                      padding: '8px 16px', 
                      border: 'none', 
                      background: bioLang === l ? 'var(--accent-color)' : 'transparent', 
                      color: bioLang === l ? 'white' : 'var(--text-secondary)', 
                      borderRadius: '8px', 
                      fontSize: '0.8rem', 
                      fontWeight: '900', 
                      cursor: 'pointer', 
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: bioLang === l ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {/* Section 1: Headline */}
              <div className="input-group-premium" style={{ background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', color: 'var(--accent-color)' }}>
                  <Type size={16} />
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('mottoLabel')}</label>
                </div>
                <input 
                  type="text" 
                  value={localMottos[bioLang] || ''} 
                  onChange={(e) => setLocalMottos({...localMottos, [bioLang]: e.target.value})}
                  className="note-input" 
                  style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '800', 
                    letterSpacing: '-0.02em',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    borderBottom: '2px solid rgba(255,255,255,0.05)',
                    width: '100%'
                  }}
                  placeholder={t('headlinePlaceholder')}
                />
              </div>
              
              {/* Section 2: Pricing */}
              <div className="input-group-premium" style={{ background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', color: '#10b981' }}>
                  <CreditCard size={16} />
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('pricingLabel')}</label>
                </div>
                <textarea 
                  className="note-input custom-scrollbar" 
                  style={{ 
                    height: '100px', 
                    fontSize: '0.95rem',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    lineHeight: '1.6',
                    width: '100%'
                  }} 
                  value={localPricing[bioLang] || ''}
                  onChange={(e) => setLocalPricing({...localPricing, [bioLang]: e.target.value})}
                  placeholder={t('pricingPlaceholder')}
                />
              </div>

              {/* Section 3: Full Bio */}
              <div className="input-group-premium" style={{ background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', color: 'var(--accent-color)' }}>
                  <FileEdit size={16} />
                  <label style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('fullBioLabel')}</label>
                </div>
                <textarea 
                  className="note-input custom-scrollbar" 
                  style={{ 
                    height: '250px', 
                    lineHeight: '1.7', 
                    fontSize: '1rem',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    width: '100%'
                  }} 
                  value={localBios[bioLang] || ''}
                  onChange={(e) => setLocalBios({...localBios, [bioLang]: e.target.value})}
                  placeholder={t('bioPlaceholder')}
                ></textarea>
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                  <span style={{ opacity: 0.6 }}>{t('bioFormattingNote')}</span>
                  <span style={{ color: (localBios[bioLang]?.length || 0) > 1800 ? 'var(--error-color)' : 'var(--accent-color)' }}>
                    {localBios[bioLang]?.length || 0} / 2000
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button onClick={onSaveBioData} className="action-btn" style={{ padding: '1.2rem 3rem', fontSize: '1rem', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '0.8rem', width: 'fit-content', marginTop: 0 }}>
                  <Check size={20} /> {t('saveChanges')}
                </button>
                {!isMobile && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: '1.4' }}>
                    {t('syncSuccessNote')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sync Area */}
        <div style={{ flex: isMobile ? '1 1 100%' : '0 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SEKCE STAŽENÍ AGENTA */}
          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--accent-color)', background: 'rgba(59, 130, 246, 0.05)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '900' }}>
              <RefreshCw size={18} color="var(--accent-color)" /> {t('agentDownload')}
            </h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              {t('agentDownloadDesc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {isAgentDownloadsLoading ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.6rem' }}>
                  {lang === 'cz' ? 'Ověřuji dostupné balíky...' : 'Checking available packages...'}
                </div>
              ) : agentDownloads.length > 0 ? (
                agentDownloads.map(item => (
                  <a
                    key={item.id}
                    href={item.downloadUrl}
                    className="action-btn"
                    style={{ fontSize: '0.75rem', padding: '0.6rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' }}
                    download
                  >
                    {item.label}{item.version ? ` v${item.version}` : ''}
                  </a>
                ))
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.75rem', border: '1px dashed var(--card-border)', borderRadius: '12px', lineHeight: 1.4 }}>
                  {lang === 'cz' ? 'Desktop agent zatím není publikovaný ke stažení.' : 'The desktop agent is not published for download yet.'}
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              {t('agentReadMeNote')}
            </p>
            {activeOperator?.isAppOwner && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <select
                  value={agentUploadPlatform}
                  onChange={(e) => setAgentUploadPlatform(e.target.value)}
                  className="note-input"
                  style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}
                >
                  <option value="windows">Windows</option>
                  <option value="macos">macOS</option>
                  <option value="linux">Linux</option>
                </select>
                <input id="agent-package-upload-input" type="file" accept=".zip,application/zip" style={{ display: 'none' }} onChange={onUploadAgentPackage} />
                <button
                  className="action-btn"
                  disabled={isAgentUploading}
                  onClick={() => document.getElementById('agent-package-upload-input').click()}
                  style={{ fontSize: '0.75rem', padding: '0.65rem', marginTop: 0 }}
                >
                  {isAgentUploading ? <Loader2 size={14} className="animate-spin" /> : '+'} {lang === 'cz' ? 'Publikovat agent ZIP' : 'Publish agent ZIP'}
                </button>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(5,7,10,0.6)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
              <RefreshCw size={18} color="var(--success-color)" className={isSyncing ? "spin-animation" : ""} /> {t('syncStatus')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { id: 'adultwork', icon: 'AW', name: 'AdultWork.com', sub: t('ukPrimary') },
                { id: 'amateri', icon: 'AM', name: 'Amateri.com', sub: 'CZ / SK' },
                { id: 'onlyfans', icon: 'OF', name: 'OnlyFans', sub: t('reviewSync') },
              ].map((p) => {
                const st = (syncStatus && syncStatus[p.id]) || 'idle';
                return (
                  <div key={p.id} className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>{p.icon}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{p.sub}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${st}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {st === 'syncing' ? <RefreshCw size={10} className="spin-animation" />
                        : st === 'synced' ? <Check size={10} />
                        : st === 'error' ? <X size={10} />
                        : <AlertTriangle size={10} />}
                      {' '}{st.toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>

            {isSyncing ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '700' }}><span>{t('syncingProfileData')}</span><span>{syncProgress}%</span></div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${syncProgress}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.2s ease' }}></div>
                </div>
              </div>
            ) : (
              <button onClick={handleSyncAll} className="action-btn" style={{ background: 'var(--success-color)', boxShadow: '0 5px 15px rgba(16, 185, 129, 0.3)' }}><RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> {t('syncAll')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebProfilesView;
