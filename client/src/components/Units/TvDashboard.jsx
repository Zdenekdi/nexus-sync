import React, { useEffect, useState } from 'react';
import { Shield, Activity, Battery, MapPin, AlertTriangle, Monitor, Volume2 } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const TvDashboard = () => {
  const { 
    sosActive, 
    activeBioWarning, 
    playBeep, 
    lang, 
     _gpsHistory,
    batteryLevel,
    heartRate
  } = useNexus();

  const [currentTime, setCurrentTime] = useState(new Date());
  const beepActive = !!(sosActive || activeBioWarning);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Beep logic for TV Dashboard
  useEffect(() => {
    if (!beepActive) return;
    
    const interval = setInterval(() => {
      playBeep();
    }, 2000); // Repeated beep every 2 seconds
    
    return () => clearInterval(interval);
  }, [beepActive, playBeep]);

  const isCz = lang === 'cz';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#04060b',
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      overflow: 'hidden',
      fontFamily: 'inherit',
      position: 'relative'
    }}>
      {/* Background Pulse for Alarm */}
      {(sosActive || activeBioWarning) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: sosActive ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
          animation: 'pulse-bg 2s infinite ease-in-out',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '64px', height: '64px', 
            background: 'var(--accent-color)', 
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
          }}>
            <Monitor size={36} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>
              AGENCY <span style={{ color: 'var(--accent-color)' }}>HUB</span>
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1rem' }}>
              COMMAND CENTER | {isCz ? 'DISPEČINK' : 'DISPATCH'}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '0.05em' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600', fontSize: '1.2rem' }}>
            {currentTime.toLocaleDateString(isCz ? 'cs-CZ' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '2rem', 
        zIndex: 1,
        minHeight: 0 
      }}>
        
        {/* Map Area */}
        <div style={{
          background: 'rgba(255,255,255,0.01)',
          borderRadius: '32px',
          border: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          { _gpsHistory.length > 0 ? (
            <div style={{ textAlign: 'center' }}>
              <MapPin size={80} color="var(--accent-color)" />
              <p style={{ fontSize: '1.5rem', marginTop: '1rem', color: 'rgba(255,255,255,0.5)' }}>Map Stream Active</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', opacity: 0.2 }}>
              <Monitor size={120} />
              <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>NO ACTIVE GPS STREAM</p>
            </div>
          )}

          {/* Status Overlay */}
          <div style={{
            position: 'absolute',
            top: '2rem',
            right: '2rem',
            background: 'rgba(0,0,0,0.8)',
            padding: '1.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Activity size={24} color="#10b981" />
                <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>SYSTEM ONLINE</span>
             </div>
             {beepActive && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Volume2 size={24} color="#ef4444" className="pulse" />
                  <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ef4444' }}>AUDIO ALERT ACTIVE</span>
               </div>
             )}
          </div>
        </div>

        {/* Sidebar Status List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Incidents Header */}
          <div style={{ 
            padding: '1rem 1.5rem', 
            background: sosActive ? '#ef4444' : (activeBioWarning ? '#f59e0b' : 'rgba(255,255,255,0.05)'),
            borderRadius: '20px',
            color: (sosActive || activeBioWarning) ? 'white' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.4s ease'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <AlertTriangle size={24} />
              {isCz ? 'AKTIVNÍ INCIDENTY' : 'ACTIVE INCIDENTS'}
            </h3>
          </div>

          {/* Incident List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(sosActive || activeBioWarning) ? (
              <div style={{
                padding: '2rem',
                borderRadius: '24px',
                background: sosActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `2px solid ${sosActive ? '#ef4444' : '#f59e0b'}`,
                animation: 'pulse-border 2s infinite'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                   <span style={{ fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                     {sosActive ? (isCz ? 'KRITICKÉ SOS' : 'CRITICAL SOS') : (isCz ? 'VAROVÁNÍ' : 'WARNING')}
                   </span>
                   <span style={{ opacity: 0.6 }}>JUST NOW</span>
                </div>
                <h2 style={{ fontSize: '2rem', margin: '0 0 1rem' }}>MODEL_UNIT_ALPHA</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                      <Activity size={18} style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{heartRate || '--'} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>BPM</span></div>
                   </div>
                   <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                      <Battery size={18} style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{batteryLevel || '--'}%</div>
                   </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '24px', color: 'rgba(255,255,255,0.1)' }}>
                <Shield size={48} style={{ marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.2rem', fontWeight: '700' }}>{isCz ? 'VŠECHNY JEDNOTKY JSOU V BEZPEČÍ' : 'ALL UNITS ARE SECURE'}</p>
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div style={{ 
            padding: '1.5rem', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>ACTIVE RELAYS</span>
              <span style={{ fontWeight: '900' }}>12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>GUARD NODES</span>
              <span style={{ fontWeight: '900', color: '#10b981' }}>ONLINE</span>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse-bg {
          0% { opacity: 0.3; }
          50% { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        @keyframes pulse-border {
          0% { border-color: rgba(239, 68, 68, 0.4); }
          50% { border-color: rgba(239, 68, 68, 1); }
          100% { border-color: rgba(239, 68, 68, 0.4); }
        }
        .pulse {
          animation: pulse-icon 1s infinite;
        }
        @keyframes pulse-icon {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default TvDashboard;
