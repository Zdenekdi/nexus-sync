import { Shield, Clock, CheckCircle, LogOut, Zap, Mic, MicOff, Battery, Phone, PhoneOff, UserCheck, XCircle, Bluetooth, Activity, Settings, ChevronDown } from 'lucide-react';
import { useNexus } from '../../context/NexusContext';

const SafetyControlCard = () => {
  const { 
    t, lang, isMobile, sosActive, linkedSessionId, checkinMinutes, setCheckinMinutes,
    checkinTimerEnd, checkinRemaining, triggerSOS, cancelSOS, 
    startCheckinTimer, resetCheckinTimer, confirmDeparture,
    SAFETY_SUGGESTIONS, onDelayBooking, pendingNotifications,
    linkedTrackerId, lastTrackerUpdate, voiceGuardianActive, handleToggleVoiceGuardian,
    batteryLevel, incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    heartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected
  } = useNexus();

  const isCz = lang === 'cz' || lang === 'cs';
  const suggestions = SAFETY_SUGGESTIONS || ['15m', '30m', '45m', '60m', '1.5h', '2h'];

  const handleSuggestionClick = (s) => {
    let mins = 60;
    if (s.includes('m')) mins = parseInt(s);
    if (s.includes('h')) mins = parseFloat(s) * 60;
    setCheckinMinutes(mins);
  };

  const formatRemaining = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="glass-card" style={{ 
      padding: isMobile ? '1.25rem' : '1.5rem', 
      borderRadius: '24px', 
      background: sosActive ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)', 
      border: `1px solid ${sosActive ? 'rgba(239,68,68,0.3)' : 'var(--card-border)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      transition: 'all 0.3s ease'
    }}>
      {/* Battery & Signal Overview */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Battery size={14} color={batteryLevel <= 15 ? '#ef4444' : '#22c55e'} />
          <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>{batteryLevel || 100}% {isCz ? 'Baterie' : 'Battery'}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Zap size={14} color="#3b82f6" />
          <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>{isCz ? 'Systém' : 'System'} {t.secure}</div>
        </div>
      </div>

      {/* Tracker Status Line if Linked */}
      {linkedTrackerId && (
        <div style={{ 
          fontSize: '0.75rem', 
          background: 'rgba(34, 197, 94, 0.05)', 
          padding: '0.6rem 0.8rem', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          border: '1px solid rgba(34, 197, 94, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontWeight: 700 }}>
             <div style={{ 
               width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e',
               animation: (lastTrackerUpdate && (Date.now() - lastTrackerUpdate < 45000)) ? 'pulse-signal 1.5s infinite' : 'none'
             }} />
             {isCz ? 'Zdroj: Tracker' : 'Source: Tracker'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
            {lastTrackerUpdate 
              ? (isCz ? `Aktivní před ${Math.floor((Date.now() - lastTrackerUpdate)/1000)}s` : `Active ${Math.floor((Date.now() - lastTrackerUpdate)/1000)}s ago`)
              : (isCz ? 'Čekání na signál...' : 'Waiting for signal...')}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-signal {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>

      {linkedSessionId && !sosActive && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
          <button 
            onClick={() => onDelayBooking(linkedSessionId, 15)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
          >
            {isCz ? '+15m Odložit' : '+15m Delay'}
          </button>
          <button 
            onClick={() => onDelayBooking(linkedSessionId, 30)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
          >
            {isCz ? '+30m Odložit' : '+30m Delay'}
          </button>
        </div>
      )}

      {/* SOS Button */}
      <button
        onClick={async () => {
          if (sosActive) {
            const ok = await verifyIdentity();
            if (ok) cancelSOS();
          } else {
            triggerSOS('manual');
          }
        }}
        style={{
          width: '100%', 
          padding: '1.25rem', 
          borderRadius: '18px',
          background: sosActive ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
          border: sosActive ? '1px solid #ef4444' : 'none', 
          color: sosActive ? '#ef4444' : 'white', 
          fontSize: '1.2rem', 
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: sosActive ? 'none' : '0 10px 30px rgba(239, 68, 68, 0.2)',
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem'
        }}
        className={sosActive ? '' : 'pulse-subtle'}
      >
        <Shield size={24} fill={sosActive ? 'none' : 'white'} fillOpacity={0.2} />
        {sosActive 
          ? (isCz ? 'ZRUŠIT SOS (IDENTITA)' : 'CANCEL SOS (IDENTITY)') 
          : (isCz ? 'NOUZOVÉ SOS' : 'EMERGENCY SOS')}
      </button>

      {/* Voice Guardian Toggle */}
      <div 
        onClick={handleToggleVoiceGuardian}
        style={{ 
          fontSize: '0.75rem', 
          background: voiceGuardianActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
          padding: '0.8rem 1rem', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          border: voiceGuardianActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '10px', 
            background: voiceGuardianActive ? '#3b82f6' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: voiceGuardianActive ? 'white' : 'var(--text-secondary)'
          }}>
            {voiceGuardianActive ? <Mic size={16} /> : <MicOff size={16} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: voiceGuardianActive ? '#3b82f6' : 'white' }}>
              {t.voiceGuardian}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              {voiceGuardianActive ? t.listeningToKeywords : t.voiceGuardianDesc}
            </div>
          </div>
        </div>
        <div style={{ 
          width: '36px', height: '20px', borderRadius: '20px', 
          background: voiceGuardianActive ? '#3b82f6' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'all 0.3s ease'
        }}>
           <div style={{ 
             width: '14px', height: '14px', borderRadius: '50%', background: 'white',
             position: 'absolute', top: '3px', left: voiceGuardianActive ? '19px' : '3px',
             transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
           }} />
        </div>
      </div>

      {!sosActive && (
        <div 
          onClick={() => triggerGhostCall(20)}
          style={{ 
            marginTop: '1.5rem',
            background: ghostCallScheduledAt ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)', 
            padding: '1rem', 
            borderRadius: '16px', 
            border: ghostCallScheduledAt ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: ghostCallScheduledAt ? 'default' : 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Phone size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{t.ghostCall}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                {ghostCallScheduledAt 
                  ? (isCz ? `Vyzvánění začne za ${Math.ceil((ghostCallScheduledAt - Date.now())/1000)}s` : `Calling in ${Math.ceil((ghostCallScheduledAt - Date.now())/1000)}s`)
                  : t.ghostCallDesc}
              </div>
            </div>
          </div>
          {!ghostCallScheduledAt && <ChevronDown size={16} color="var(--text-secondary)" style={{ transform: 'rotate(-90deg)' }} />}
        </div>
      )}

      {/* Ghost Call Fullscreen Overlay */}
      {incomingGhostCall && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
          zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'space-between', padding: '4rem 2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
             <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                <UserCheck size={40} color="white" />
             </div>
             <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>AGENCY RELAY</div>
             <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px' }}>INCOMING CALL...</div>
          </div>

          <div style={{ display: 'flex', gap: '4rem' }}>
             <div onClick={() => setIncomingGhostCall(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}>
                   <PhoneOff size={28} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>Decline</div>
             </div>
             <div onClick={() => setIncomingGhostCall(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
                   <Phone size={28} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>Accept</div>
             </div>
          </div>
        </div>
      )}

      {/* Check-in Timer Controls */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {!checkinTimerEnd ? (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number" min="5" max="480" value={checkinMinutes}
                  onChange={e => setCheckinMinutes(Math.max(5, Math.min(480, Number(e.target.value))))}
                  style={{ 
                    width: '100%', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '12px', 
                    background: 'rgba(0,0,0,0.2)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'white', 
                    fontSize: '1rem', 
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800' }}>min</span>
              </div>
              <button 
                onClick={() => startCheckinTimer()} 
                style={{
                  padding: '0.8rem 1.5rem', 
                  borderRadius: '12px',
                  background: 'var(--accent-color)', 
                  border: 'none',
                  color: 'white', 
                  fontWeight: '800', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Clock size={18} />
                {isCz ? 'Start' : 'Start'}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '900', 
                color: checkinRemaining && checkinRemaining < 120000 ? '#ef4444' : 'var(--accent-color)', 
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}>
                {checkinRemaining ? formatRemaining(checkinRemaining) : '--:--'}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: linkedSessionId ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
              <button 
                onClick={resetCheckinTimer} 
                style={{
                  padding: '0.9rem', 
                  borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.15)', 
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e', 
                  fontWeight: '900', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle size={18} />
                {isCz ? 'JSEM OK' : 'I\'M OK'}
              </button>
              
              {linkedSessionId && (
                <button 
                  onClick={confirmDeparture} 
                  style={{
                    padding: '0.9rem', 
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.15)', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#3b82f6', 
                    fontWeight: '900', 
                    fontSize: '0.9rem', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <LogOut size={18} />
                  {isCz ? 'KLIENT ODEŠEL' : 'CLIENT LEFT'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.03)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Bluetooth size={16} color="#3b82f6" />
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'white' }}>GUARDIAN IoT</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Heart Rate Tracking */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
               <div style={{ position: 'relative' }}>
                 <Activity size={18} color={heartRate > 0 ? '#10b981' : 'rgba(255,255,255,0.2)'} className={heartRate > 0 ? 'pulse' : ''} />
               </div>
               <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                 {isCz ? 'Srdeční tep' : 'Heart Rate'}
               </span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: heartRate > hrThreshold ? '#ef4444' : 'white' }}>
              {heartRate > 0 ? `${heartRate} BPM` : (isCz ? 'Nepřipojeno' : 'Disconnected')}
            </div>
          </div>

          {/* Threshold Setting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>
                <span>{isCz ? 'LIMIT PRO TICHÝ ALARM' : 'SILENT SOS THRESHOLD'}</span>
                <span style={{ color: 'var(--accent-color)' }}>{hrThreshold} BPM</span>
             </div>
             <input 
               type="range" min="100" max="180" value={hrThreshold}
               onChange={(e) => setHrThreshold(Number(e.target.value))}
               style={{ width: '100%', accentColor: 'var(--accent-color)', height: '4px', cursor: 'pointer' }}
             />
          </div>

          {/* Action Buttons */}
          <button 
             onClick={() => {
               // Mocking the BLE pairing trigger
               if (typeof navigator.bluetooth !== 'undefined') {
                 navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })
                   .then(() => setIsBluetoothConnected(true))
                   .catch(() => {});
               } else {
                 setIsBluetoothConnected(!isBluetoothConnected); // Toggle simulation
               }
             }}
             style={{ 
               marginTop: '0.5rem',
               padding: '0.6rem', 
               borderRadius: '10px', 
               background: isBluetoothConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', 
               border: `1px solid ${isBluetoothConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'}`,
               color: isBluetoothConnected ? '#22c55e' : 'white',
               fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer'
             }}
          >
             {isBluetoothConnected ? (isCz ? 'Zařízení aktivní ✓' : 'Device Active ✓') : (isCz ? 'Párovat Smart Band' : 'Pair Smart Band')}
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.7, lineHeight: 1.4 }}>
        {linkedSessionId
          ? (isCz ? 'Časovač je napojen na vaši rezervaci. Po uplynutí se automaticky odešle SOS.' : 'Timer is linked to your booking. SOS will auto-trigger when time expires.')
          : (isCz ? 'Pokud nepotvrdíte stav včas, systém automaticky rozešle SOS s vaší polohou.' : 'If you don\'t check in on time, SOS with your location will be sent automatically.')
        }
      </div>
    </div>
  );
};

export default SafetyControlCard;
