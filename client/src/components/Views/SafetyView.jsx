import React, { useState } from 'react';
import { Shield, AlertTriangle, Phone, Activity, Lock, Eye, Mic } from 'lucide-react';
import { useNexus } from '../../context/NexusContextCore';
import BlacklistPanel from '../Safety/BlacklistPanel';
import SOSPanel from '../Safety/SOSPanel';
import SafetyControlCard from '../Safety/SafetyControlCard';

const SafetyView = () => {
  const nexus = useNexus();
  const { t, lang, activeRole, isMobile, voiceGuardianActive,  _audioSentinelActive, sosActive } = nexus;
  const [subTab, setSubTab] = useState('blacklist');

  const isCz = lang === 'cz' || lang === 'cs';
  const isModelRole = activeRole === 'Model';
  const tabs = [
    { id: 'blacklist', label: t('blacklist'), icon: AlertTriangle },
    ...(!isModelRole ? [{ id: 'sos', label: t('sosAlerts'), icon: Phone }] : [])
  ];

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent)' }}>
      {/* Premium Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--accent-color)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="white" />
            </div>
            <h2 style={{ margin: 0, fontWeight: 950, fontSize: '1.5rem', color: 'white', letterSpacing: '-0.02em' }}>
              GUARDIAN <span style={{ color: 'var(--accent-color)' }}>SUITE</span>
            </h2>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            {isCz ? 'Prémiová ochrana a dohled v reálném čase' : 'Premium real-time protection and monitoring'}
          </p>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={14} color={sosActive ? '#ef4444' : '#22c55e'} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white' }}>{sosActive ? 'SOS ACTIVE' : 'SECURED'}</span>
            </div>
            {voiceGuardianActive && (
              <div style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mic size={14} color="#3b82f6" className="pulse-subtle" />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6' }}>VOICE ACTIVE</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: (isMobile || !isModelRole) ? '1fr' : '380px 1fr', 
        gap: '2rem',
        overflow: 'hidden'
      }}>
        {/* Model-specific Controls */}
        {isModelRole && (
          <div style={{ overflowY: 'auto' }} className="custom-scrollbar">
            <SafetyControlCard />
            
            {/* Additional Safety Tips for Premium Feel */}
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <Eye size={16} color="var(--accent-color)" />
                <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'white' }}>{isCz ? 'Bezpečnostní tipy' : 'Safety Tips'}</span>
              </div>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
                   <div style={{ minWidth: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-color)', marginTop: '6px' }} />
                   {isCz ? 'Vždy mějte aktivní Audio Sentinel pro potvrzení dohledu.' : 'Always keep Audio Sentinel active for monitoring confirmation.'}
                </li>
                <li style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
                   <div style={{ minWidth: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-color)', marginTop: '6px' }} />
                   {isCz ? 'V případě nouze stačí nahlas říct "POMOC" nebo "SOS".' : 'In case of emergency, simply say "HELP" or "SOS" aloud.'}
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tabbed Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.25rem', borderRadius: '14px',
                  background: subTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${subTab === tab.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: subTab === tab.id ? 'white' : 'var(--text-secondary)',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', paddingBottom: isMobile ? '120px' : '2rem' }} className="custom-scrollbar">
            {subTab === 'blacklist' && <BlacklistPanel />}
            {subTab === 'sos' && <SOSPanel />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyView;
