const fs = require('fs');
const file = 'client/src/components/RelayMode.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('<div className="relay-container fade-in"'));
const endIndex = lines.lastIndexOf('    </>');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find bounds");
    process.exit(1);
}

const minimalUI = `    <div className="relay-container fade-in" style={{ 
      minHeight: '100dvh',
      background: '#07080a',
      color: 'white', 
      paddingTop: '3rem',
      paddingLeft: '1.5rem',
      paddingRight: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      width: '100%',
      boxSizing: 'border-box'
    }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color)' }}>
             <Smartphone size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            NEXUS RELAY
          </h2>
          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            {lang === 'cz' ? 'Připojeno jako:' : 'Connected as:'} <span style={{ color: 'white', fontWeight: '800' }}>{operator?.name || operator?.id || 'Modelka'}</span>
          </div>
       </div>

       <div style={{ padding: '1.5rem', borderRadius: '20px', background: isActive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: \`1px solid \${isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}\`, width: '100%', maxWidth: '320px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isActive ? 'var(--success-color)' : 'var(--_err-color)', boxShadow: \`0 0 10px \${isActive ? 'var(--success-color)' : 'var(--_err-color)'}\` }} />
            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: isActive ? 'var(--success-color)' : 'var(--_err-color)' }}>
              {isActive ? (lang === 'cz' ? 'RELAY AKTIVNÍ' : 'RELAY ACTIVE') : (lang === 'cz' ? 'RELAY POZASTAVEN' : 'RELAY PAUSED')}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {lang === 'cz' 
              ? 'Tento telefon nyní slouží pouze k automatickému přeposílání zpráv a hovorů do systému Nexus.' 
              : 'This phone is now solely used for automatically forwarding messages and calls to the Nexus system.'}
          </p>
       </div>

       {/* Status Badges */}
       <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
             <Server size={16} color={isServerConnected ? 'var(--success-color)' : 'var(--_err-color)'} />
             <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{isServerConnected ? 'API OK' : 'Offline'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
             <Battery size={16} color={batteryLevel > 20 ? 'var(--success-color)' : 'var(--_err-color)'} />
             <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{Math.round(batteryLevel)}% {isCharging && '⚡'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' }}>
             <ShieldCheck size={16} color={permissionsStatus.smsMonitoring ? 'var(--success-color)' : 'var(--text-secondary)'} />
             <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{permissionsStatus.smsMonitoring ? 'SMS OK' : 'No SMS'}</span>
          </div>
       </div>

       <div style={{ marginTop: 'auto', paddingTop: '3rem', width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={toggleRelayActive}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            {isActive ? <Pause size={18} /> : <Play size={18} />}
            {isActive ? (lang === 'cz' ? 'Pozastavit' : 'Pause Relay') : (lang === 'cz' ? 'Spustit Relay' : 'Start Relay')}
          </button>
          
          <button
            onClick={handleExitMode}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--_err-color)', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {lang === 'cz' ? 'Odhlásit (Ukončit)' : 'Logout (Exit)'}
          </button>
       </div>
    </div>
    </>
  );
};

export default RelayMode;
`;

const newLines = [...lines.slice(0, startIndex), minimalUI];
fs.writeFileSync(file, newLines.join('\n'));
console.log("Replaced UI");
