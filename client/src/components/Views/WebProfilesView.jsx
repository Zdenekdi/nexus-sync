import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChevronDown, Image, FileEdit, RefreshCw, Check, X, AlertTriangle,
  Type, CreditCard, FileText
} from 'lucide-react';

import { useNexus } from '../../context/ContextHook';
import PremiumSelector from '../UI/PremiumSelector';

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
    bioText = '',
    setBioText = () => {},
    handleSaveBio = () => {},
    handleSaveCredentials = () => {},
    isSyncing = false,
    syncStatus = { aw: 'synced', ege: 'synced', tpb: 'synced' },
    syncProgress = 0,
    relayOnline = false,
    handleSyncAll = () => {},
    showToast = () => {},
    token = '',
    API_BASE = ''
  } = nexus;
  const [bioLang, setBioLang] = useState(lang?.toUpperCase() === 'CZ' ? 'CZ' : 'EN');
  const [localBios, setLocalBios] = useState({ EN: '', CZ: '' });
  const [localMottos, setLocalMottos] = useState({ EN: '', CZ: '' });
  const [localPricing, setLocalPricing] = useState({ EN: '', CZ: '' });

  // Sync bioLang with global lang when it changes
  useEffect(() => {
    if (lang) {
      setBioLang(lang.toUpperCase());
    }
  }, [lang]);

  // Automation states
  const [automationPlatform, setAutomationPlatform] = useState('adultwork');
  const [adsPowerId, setAdsPowerId] = useState('');
  const [platformUser, setPlatformUser] = useState('');
  const [platformPass, setPlatformPass] = useState('');
  const [proxyConfig, setProxyConfig] = useState('');

  // Update fields when activeProfile changes
  useEffect(() => {
    if (activeProfile) {
      setLocalBios({
        EN: activeProfile.description_en || activeProfile.description || '',
        CZ: activeProfile.description_cz || ''
      });
      setLocalMottos({
        EN: activeProfile.bio_en || activeProfile.bio || '',
        CZ: activeProfile.bio_cz || ''
      });
      setLocalPricing({
        EN: activeProfile.pricing_en || '',
        CZ: activeProfile.pricing_cz || ''
      });
      
      setAdsPowerId(activeProfile.adsPowerId || ''); 
      setPlatformUser('');
      setPlatformPass('');
      setProxyConfig('');
    }
  }, [activeProfileId, activeProfile]);

  const onSaveBioData = async () => {
    if (!activeProfileId) return;
    try {
      await axios.patch(`${API_BASE}/profiles/${activeProfileId}`, { 
        [`description_${bioLang.toLowerCase()}`]: localBios[bioLang],
        [`bio_${bioLang.toLowerCase()}`]: localMottos[bioLang],
        [`pricing_${bioLang.toLowerCase()}`]: localPricing[bioLang],
        description: localBios[bioLang],
        bio: localMottos[bioLang]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(t('saveSuccess'), 'success');
      if (initData) initData();
    } catch (_err) {
      showToast(t('saveError'), 'error');
    }
  };

  const onSaveAutomation = async () => {
    if (!platformUser || !platformPass) {
      showToast(lang === 'cz' ? 'Zadejte uživatelské jméno a heslo.' : 'Enter username and password.', 'warning');
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
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><RefreshCw size={20} /> Nastavení automatizace (Local Bridge)</span>
              <span style={{ 
                fontSize: '0.7rem', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                background: relayOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: relayOnline ? 'var(--success-color)' : 'var(--_err-color)',
                border: `1px solid ${relayOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                fontWeight: '800'
              }}>
                {relayOnline ? 'AGENT ONLINE' : 'AGENT OFFLINE'}
              </span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              <div className="input-group-premium">
                <label className="input-label-premium">Platforma</label>
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
                  placeholder="např. j8f2k9l" 
                  value={adsPowerId}
                  onChange={(_err) => setAdsPowerId(_err.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="input-group-premium">
                <label className="input-label-premium">Uživatelské jméno / Email</label>
                <input 
                  type="text" 
                  className="note-input" 
                  placeholder="Login k webu" 
                  value={platformUser}
                  onChange={(_err) => setPlatformUser(_err.target.value)}
                />
              </div>
              <div className="input-group-premium">
                <label className="input-label-premium">Heslo</label>
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
              <label className="input-label-premium">Proxy server (volitelné)</label>
              <input 
                type="text" 
                className="note-input" 
                placeholder="host:port:user:pass" 
                value={proxyConfig}
                onChange={(_err) => setProxyConfig(_err.target.value)}
              />
            </div>

            <button onClick={onSaveAutomation} className="action-btn" style={{ marginTop: '1.5rem', width: '100%' }}>
              Uložit a ověřit spojení
            </button>

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
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
              {t('encryptionNote')}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={20} color="var(--accent-color)" /> {t('gallery')}</h3>
              <>
               <input type="file" id="photo-upload-input" accept="image/*" style={{ display: 'none' }} onChange={(_err) => {
                 const file = _err.target.files?.[0];
                 if (file) showToast((lang === 'cz' ? 'Foto vybráno: ' : 'Photo selected: ') + file.name, 'success');
               }} />
               <button className="action-btn" onClick={() => document.getElementById('photo-upload-input').click()} style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: 0, fontSize: '0.8rem' }}>+ {t('uploadPhoto')}</button>
             </>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('publicGalleryCap')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                  <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200)' }}></div>
                  <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200)' }}></div>
                  <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200)' }}></div>
                </div>
              </div>
              {!isMobile && <div style={{ width: '1px', background: 'var(--card-border)' }}></div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('privateGalleryCap')} (VIP)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                  <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200)' }}></div>
                </div>
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
                  <span style={{ color: (localBios[bioLang]?.length || 0) > 1800 ? 'var(--_err-color)' : 'var(--accent-color)' }}>
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
              <a 
                href={`${API_BASE.replace('/api', '')}/downloads/nexus-agent-windows.zip`} 
                className="action-btn" 
                style={{ fontSize: '0.75rem', padding: '0.6rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' }}
                download
              >
                🪟 Windows (.zip)
              </a>
              <a 
                href={`${API_BASE.replace('/api', '')}/downloads/nexus-agent-macos.zip`} 
                className="action-btn" 
                style={{ fontSize: '0.75rem', padding: '0.6rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' }}
                download
              >
                🍎 macOS (.zip)
              </a>
              <a 
                href={`${API_BASE.replace('/api', '')}/downloads/nexus-agent-linux.zip`} 
                className="action-btn" 
                style={{ fontSize: '0.75rem', padding: '0.6rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' }}
                download
              >
                🐧 Linux (.zip)
              </a>
            </div>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
              {t('agentReadMeNote')}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(5,7,10,0.6)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
              <RefreshCw size={18} color="var(--success-color)" className={isSyncing ? "spin-animation" : ""} /> {t('syncStatus')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>AW</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>AdultWork.com</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('ukPrimary')}</div>
                  </div>
                </div>
                <div className={`sync-badge ${syncStatus.aw}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                  {syncStatus.aw === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.aw === 'synced' ? <Check size={10} /> : <X size={10} />)}
                  {syncStatus.aw?.toUpperCase()}
                </div>
              </div>

              <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>EG</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>EuroGirlsEscort</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('euWide')}</div>
                  </div>
                </div>
                <div className={`sync-badge ${syncStatus.ege}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                  {syncStatus.ege === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.ege === 'synced' ? <Check size={10} /> : <X size={10} />)}
                  {syncStatus.ege?.toUpperCase()}
                </div>
              </div>

              <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>TP</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>ThePuntersB...</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('reviewSync')}</div>
                  </div>
                </div>
                <div className={`sync-badge ${syncStatus.tpb}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                  {syncStatus.tpb === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.tpb === 'synced' ? <Check size={10} /> : <AlertTriangle size={10} />)}
                  {syncStatus.tpb?.toUpperCase()}
                </div>
              </div>
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
