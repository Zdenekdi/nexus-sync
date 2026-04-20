import React, { useState } from 'react';
import { Shield, AlertTriangle, Phone } from 'lucide-react';
import { useNexus } from '../../context/NexusContext';
import BlacklistPanel from '../Safety/BlacklistPanel';
import SOSPanel from '../Safety/SOSPanel';
import SafetyControlCard from '../Safety/SafetyControlCard';

const SafetyView = () => {
  const nexus = useNexus();
  const { t, activeRole, isMobile } = nexus;
  const [subTab, setSubTab] = useState('blacklist');

  const isModelRole = activeRole === 'Model';
  const tabs = [
    { id: 'blacklist', label: t('blacklist'), icon: AlertTriangle },
    ...(!isModelRole ? [{ id: 'sos', label: t('sosAlerts'), icon: Phone }] : [])
  ];

  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header (Hidden on Mobile as it's in the Top Bar) */}
      {!isMobile && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Shield size={24} color="var(--accent-color)" />
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: 'white' }}>{t('safety')}</h2>
          </div>
        </div>
      )}

      {/* Tabs Container */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '10px',
                background: subTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${subTab === tab.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: subTab === tab.id ? 'white' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: isMobile ? '120px' : '2rem' }} className="custom-scrollbar">
        {isModelRole && (
          <div style={{ marginBottom: '1.5rem' }}>
            <SafetyControlCard />
          </div>
        )}
        {subTab === 'blacklist' && <BlacklistPanel />}
        {subTab === 'sos' && <SOSPanel />}
      </div>
    </div>
  );
};

export default SafetyView;
