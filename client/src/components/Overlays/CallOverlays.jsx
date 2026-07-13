import React from 'react';
import { Phone, PhoneCall, X, PhoneOff } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';
import { useOperatorWebRTC } from '../../hooks/useOperatorWebRTC';

const CallOverlays = () => {
  const { t } = useNexus();
  const { incomingCall, activeCall, answer, reject, hangup } = useOperatorWebRTC();

  return (
    <>
      {/* Incoming Relay Call Popup (WebRTC z GSM) */}
      {incomingCall && !activeCall && (
        <div className="incoming-call-popup fade-in" style={{ zIndex: 9999 }}>
          <div className="incoming-card">
            <div className="avatar-pulse"><Phone size={32} color="white" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)' }}>{t('incomingRelay') || 'INCOMING RELAY'}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{incomingCall.callerId || 'Neznámé'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={answer} className="circle-btn accept"><PhoneCall size={20} /></button>
              <button onClick={reject} className="circle-btn decline"><X size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Active Relay Call Overlay */}
      {activeCall && (
        <div className="incoming-call-popup fade-in" style={{ zIndex: 9999 }}>
          <div className="incoming-card" style={{ borderColor: 'var(--accent-color)' }}>
            <div className="avatar-pulse" style={{ backgroundColor: 'var(--accent-color)' }}><Phone size={32} color="white" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)' }}>{t('activeRelay') || 'ACTIVE RELAY'}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{activeCall.callerId || 'Neznámé'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={hangup} className="circle-btn decline"><PhoneOff size={20} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallOverlays;
