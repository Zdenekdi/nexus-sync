import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChevronDown, Image, FileEdit, RefreshCw, Check, X, AlertTriangle 
} from 'lucide-react';

import { useNexus } from '../../context/ContextHook';
import PremiumSelector from '../UI/PremiumSelector';

const WebProfilesView = () => {
  const nexus = useNexus();
  const {
    isMobile,
    t,
    lang,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    assignedProfiles,
    bioText,
    setBioText,
    handleSaveBio,
    handleSaveCredentials,
    isSyncing,
    syncStatus,
    syncProgress,
    relayOnline,
    handleSyncAll,
    showToast,
    token,
    API_BASE
  } = nexus;
  const [bioLang, setBioLang] = useState('EN');

  // Automation states
  const [automationPlatform, setAutomationPlatform] = useState('adultwork');
  const [adsPowerId, setAdsPowerId] = useState('');
  const [platformUser, setPlatformUser] = useState('');
  const [platformPass, setPlatformPass] = useState('');
  const [proxyConfig, setProxyConfig] = useState('');

  // Update fields when activeProfile changes
  useEffect(() => {
    if (activeProfile) {
      Promise.resolve().then(() => {
        setAdsPowerId(''); 
        setPlatformUser('');
        setPlatformPass('');
        setProxyConfig('');
      });
    }
  }, [activeProfileId, activeProfile]);

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
              <label className="input-label-premium">Váš Relay Token (pro Local Agent)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="password" 
                  readOnly 
                  className="note-input" 
                  style={{ fontSize: '0.7rem', fontFamily: 'monospace' }} 
                  value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                />
                <button 
                  className="action-btn" 
                  style={{ padding: '0 1rem', background: 'var(--card-bg)' }}
                  onClick={async () => {
                    try {
                      const res = await axios.get(`${API_BASE}/auth/relay-token`, { headers: { Authorization: `Bearer ${token}` } });
                      navigator.clipboard.writeText(res.data.token);
                      showToast(lang === 'cz' ? 'Token zkopírován!' : 'Token copied!', 'success');
                    } catch {
                      showToast('Chyba při generování tokenu', 'error');
                    }
                  }}
                >
                  Kopírovat
                </button>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                * Tento token vložte do souboru <code>.env</code> vašeho Local Agenta jako <code>RELAY_TOKEN</code>.
              </p>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
              * Údaje budou uloženy pomocí AES-256 šifrování.
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

          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                <FileEdit size={20} color="var(--accent-color)" /> {t('biography')} & {t('services')}
              </h3>
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                <button onClick={() => setBioLang('EN')} style={{ padding: '6px 12px', border: 'none', background: bioLang === 'EN' ? 'var(--accent-color)' : 'transparent', color: bioLang === 'EN' ? 'white' : 'var(--text-secondary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
                <button onClick={() => setBioLang('CZ')} style={{ padding: '6px 12px', border: 'none', background: bioLang === 'CZ' ? 'var(--accent-color)' : 'transparent', color: bioLang === 'CZ' ? 'white' : 'var(--text-secondary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>CZ</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="input-group-premium">
                <label className="input-label-premium">{t('mottoLabel')}</label>
                <input 
                  type="text" 
                  defaultValue={activeProfile?.bio || ''} 
                  className="note-input" 
                  style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    letterSpacing: '-0.01em',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                  }}
                  placeholder="Enter a catchy headline..."
                />
              </div>
              
              <div className="input-group-premium">
                <label className="input-label-premium">{t('fullBioLabel')}</label>
                <textarea 
                  className="note-input custom-scrollbar" 
                  style={{ 
                    height: '220px', 
                    lineHeight: '1.6', 
                    fontSize: '1rem',
                    borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                    paddingBottom: '1rem'
                  }} 
                  value={bioText || activeProfile?.description || ''}
                  onChange={_err => setBioText(_err.target.value)}
                  placeholder={t('bioPlaceholder')}
                ></textarea>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>{t('bioFormattingNote')}</span>
                  <span style={{ color: 'var(--accent-color)' }}>{bioText?.length || 0} / 2000</span>
                </div>
              </div>
              
              <button onClick={handleSaveBio} className="action-btn" style={{ width: 'fit-content', padding: '1rem 2.5rem', fontSize: '1rem', marginTop: '1rem', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' }}>
                {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sync Area */}
        <div style={{ flex: isMobile ? '1 1 100%' : '0 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
