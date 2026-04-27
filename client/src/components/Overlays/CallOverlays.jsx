import React from 'react';
import { Phone, X } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const CallOverlays = () => {
  const {
    incomingRelayCall,
    setIncomingRelayCall,
    t,
  } = useNexus();

  // Relay call overlays — for non-SIP incoming_call socket events
  // (SIP WebRTC calls are handled by SipManager)
  return (
    <>
      {/* Incoming Relay Call Popup */}
      {incomingRelayCall && (
        <div className="incoming-call-popup fade-in">
          <div className="incoming-card">
            <div className="avatar-pulse"><Phone size={32} color="white" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)' }}>{t('incomingRelay')}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{incomingRelayCall.caller}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('targetLabel')}: <strong>{incomingRelayCall.profileName}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setIncomingRelayCall(null)} className="circle-btn decline"><X size={20} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallOverlays;
