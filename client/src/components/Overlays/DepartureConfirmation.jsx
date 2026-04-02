import React from 'react';
import axios from 'axios';

const DepartureConfirmation = ({
  departureCheckActive,
  departureTimeLeft,
  setDepartureCheckActive,
  token,
  API_BASE,
  activeSafetySession,
  departureSessionId
}) => {
  if (!departureCheckActive) return null;

  const handleConfirm = (type) => {
    const sessionId = departureSessionId || activeSafetySession?.id;
    const endpoint = type === 'safe' ? 'departure-confirm' : 'panic';
    
    setDepartureCheckActive(false);
    axios.post(`${API_BASE}/safety/sessions/${sessionId}/${endpoint}`, {}, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#0f1117', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 40px rgba(16,185,129,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚪</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.4rem' }}>Opustil klient bezpečně?</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: '900', color: departureTimeLeft < 60 ? '#ef4444' : '#10b981' }}>
            {String(Math.floor(departureTimeLeft / 60)).padStart(2, '0')}:{String(departureTimeLeft % 60).padStart(2, '0')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button
            onClick={() => handleConfirm('safe')}
            className="action-btn"
            style={{ flex: 1, background: 'var(--success-color)', color: 'white', fontWeight: '800' }}
          >
            Safe Departure
          </button>
          <button
            onClick={() => handleConfirm('panic')}
            className="action-btn"
            style={{ flex: 1, background: 'var(--error-color)', color: 'white', fontWeight: '800' }}
          >
            PANIC ALERT
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartureConfirmation;
