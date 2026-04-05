/* src/components/Modals/EmergencyAlert.jsx */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const EmergencyAlert = ({ alert, onAcknowledge, isAcknowledgeLoading, t: _t, onDismiss }) => {
  if (!alert) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(239, 68, 68, 0.95)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: 'white', backdropFilter: 'blur(15px)' }}>
        <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem', animation: 'pulsate 1.5s infinite ease-in-out' }}>
                <AlertTriangle size={120} />
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: '950', marginBottom: '1rem' }}>EMERGENCY ALERT</h1>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '30px', marginBottom: '2rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{alert.profileName} · {alert.type.toUpperCase()}</div>
                <div style={{ fontSize: '1rem', opacity: 0.8, marginTop: '0.5rem' }}>ACTIVE SESSION ID: {alert.sessionId}</div>
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={onAcknowledge}
                        disabled={isAcknowledgeLoading}
                        className="action-btn"
                        style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.55)', color: '#86efac', fontWeight: '900', fontSize: '1rem', padding: '1rem', margin: 0, opacity: isAcknowledgeLoading ? 0.7 : 1 }}
                    >
                        {isAcknowledgeLoading ? 'ACKNOWLEDGING...' : 'ACKNOWLEDGE SAFE (+10m)'}
                    </button>
                    <button
                        onClick={onDismiss}
                        className="action-btn" 
                        style={{ background: 'white', color: '#ef4444', fontWeight: '900', fontSize: '1.2rem', padding: '1.5rem', margin: 0 }}
                    >
                        ACKNOWLEDGE & DISMISS
                    </button>
                </div>
            </div>
        </div>
        <style>{`
            @keyframes pulsate { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
    </div>
  );
};

export default EmergencyAlert;
