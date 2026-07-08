import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { APP_VERSION } from '../constants/config';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

const UpdateBanner = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/vultr/latest-version`);
        // Basic version comparison (e.g. v3.21.0 vs v3.22.0)
        // We strip 'v' and compare strings or use a more robust check
        const remoteVersion = data.version.replace('v', '');
        const localVersion = APP_VERSION.replace('v', '').replace('-auto', '');

        if (remoteVersion !== localVersion) {
          console.log(`[Update] New version available: ${data.version} (Local: ${APP_VERSION})`);
          setUpdateInfo(data);
          setIsVisible(true);
        }
      } catch (err) {
        console.warn('[Update] Failed to check for updates:', err.message);
      }
    };

    // Check once on mount
    checkVersion();
    
    // Then every hour
    const interval = setInterval(checkVersion, 3600000);
    return () => clearInterval(interval);
  }, []);

  const handleOTAUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      console.log("[OTA] Starting update for version:", updateInfo.version);
      
      // 1. Download the ZIP from server (Nexus API should provide this)
      // Note: We expect the server to have a zip at /downloads/nexus-relay.zip
      const updateUrl = updateInfo.downloadUrl.replace('.apk', '.zip');
      
      const version = await CapacitorUpdater.download({
        url: updateUrl,
        version: updateInfo.version
      });

      console.log("[OTA] Update downloaded, applying...");
      
      // 2. Set the new version as active
      await CapacitorUpdater.set(version);
      
      // App will reload automatically or we can force it
      console.log("[OTA] Update applied successfully!");
    } catch (err) {
      console.error("[OTA] Update failed:", err.message);
      alert("Aktualizace selhala: " + err.message);
      setIsUpdating(false);
    }
  };

  if (!isVisible || !updateInfo) return null;

  return (
    <div className="update-banner-fixed" style={{
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: '90%',
      maxWidth: '500px',
      background: 'rgba(15, 17, 23, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--accent-color)',
      borderRadius: '20px',
      padding: '1.25rem',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '12px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent-color)'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'white' }}>Nová verze k dispozici!</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Verze {updateInfo.version} přináší vylepšení stability a nové funkce.
            </div>
          </div>
        </div>
        <button onClick={() => setIsVisible(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <a 
          href={updateInfo.downloadUrl} 
          target="_blank" 
          rel="noreferrer"
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            padding: '0.8rem', 
            background: 'var(--accent-color)', 
            color: 'white', 
            borderRadius: '12px', 
            fontSize: '0.85rem', 
            fontWeight: '800', 
            textDecoration: 'none' 
          }}
        >
          <Download size={16} /> STÁHNOUT APK
        </a>
        <button 
          onClick={handleOTAUpdate}
          disabled={isUpdating}
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem', 
            padding: '0.8rem', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid var(--card-border)',
            color: 'white', 
            borderRadius: '12px', 
            fontSize: '0.85rem', 
            fontWeight: '800',
            cursor: isUpdating ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} /> 
          {isUpdating ? 'AKTUALIZUJI...' : 'BLESKOVÝ UPDATE'}
        </button>
      </div>

      {isUpdating && (
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
          <div className="update-progress-bar" style={{ height: '100%', background: 'var(--accent-color)', width: '0%', animation: 'loading 3s linear forwards' }}></div>
        </div>
      )}
    </div>
  );
};

export default UpdateBanner;
