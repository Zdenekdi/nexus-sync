import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Server, Loader2, ArrowLeft } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';
import axios from 'axios';

const DownloadsView = () => {
  const { lang, API_BASE } = useNexus();
  const [apkInfo, setApkInfo] = useState({ relay: null, full: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApkInfo = async () => {
      try {
        const [relayRes, fullRes] = await Promise.all([
          axios.get(`${API_BASE}/vultr/apk-info?type=relay`),
          axios.get(`${API_BASE}/vultr/apk-info?type=full`)
        ]);
        
        setApkInfo({
          relay: relayRes.data.available ? relayRes.data : null,
          full: fullRes.data.available ? fullRes.data : { available: true, downloadUrl: `${API_BASE}/vultr/download-full.apk`, version: '' }
        });
      } catch (err) {
        console.error('Failed to fetch APK info', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchApkInfo();
  }, [API_BASE]);

  const t = {
    cz: {
      title: 'Aplikace ke stažení',
      subtitle: 'Stáhněte si nativní aplikace pro systém Android.',
      relayTitle: 'Nexus Relay',
      relayDesc: 'Určeno pro dedikované telefony fungující jako komunikační brána (přesměrování SMS a hovorů).',
      fullTitle: 'Nexus Hub (Klientská aplikace)',
      fullDesc: 'Standardní aplikace pro operátorky a manažery. Zahrnuje chat, push notifikace a správu profilů.',
      downloadBtn: 'Stáhnout APK',
      notAvailable: 'Aktuálně nedostupné'
    },
    en: {
      title: 'Downloads',
      subtitle: 'Download native applications for Android.',
      relayTitle: 'Nexus Relay',
      relayDesc: 'Designed for dedicated phones acting as a communication gateway (SMS and call forwarding).',
      fullTitle: 'Nexus Hub (Client App)',
      fullDesc: 'Standard application for operators and managers. Includes chat, push notifications, and profile management.',
      downloadBtn: 'Download APK',
      notAvailable: 'Currently unavailable'
    }
  }[lang];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-color)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem' }}>{t.subtitle}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Full App Card */}
        <div style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '24px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backdropFilter: 'blur(10px)', transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <Smartphone size={40} color="#3b82f6" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>{t.fullTitle}</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: '1.6', flexGrow: 1 }}>
            {t.fullDesc}
          </p>
          
          {apkInfo.full ? (
            <a href={apkInfo.full.downloadUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', width: '100%' }}>
              <button style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'background 0.2s' }}>
                <Download size={20} />
                {t.downloadBtn} {apkInfo.full.version ? `(v${apkInfo.full.version})` : ''}
              </button>
            </a>
          ) : (
            <button disabled style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'not-allowed' }}>
              {t.notAvailable}
            </button>
          )}
        </div>

        {/* Relay App Card */}
        <div style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '24px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backdropFilter: 'blur(10px)', transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <Server size={40} color="#8b5cf6" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>{t.relayTitle}</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: '1.6', flexGrow: 1 }}>
            {t.relayDesc}
          </p>
          
          {apkInfo.relay ? (
            <a href={apkInfo.relay.downloadUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', width: '100%' }}>
              <button style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'background 0.2s' }}>
                <Download size={20} />
                {t.downloadBtn} {apkInfo.relay.version ? `(v${apkInfo.relay.version})` : ''}
              </button>
            </a>
          ) : (
            <button disabled style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'not-allowed' }}>
              {t.notAvailable}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default DownloadsView;
