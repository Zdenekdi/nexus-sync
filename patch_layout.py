import re

with open("client/src/RelayApp.jsx", "r") as f:
    content = f.read()

dashboard_ui_match = re.search(r'\{/\* Main UI \*/\}(.*?)</>\n  \);\n}', content, re.DOTALL)
if not dashboard_ui_match:
    print("Could not find Main UI")
    exit(1)

new_ui = """{/* Main UI */}
      <style>{`
        @keyframes pulseIndicator {
          0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(74, 222, 128, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3.5rem 1.5rem',
        boxSizing: 'border-box'
      }}>
        
        {/* Header/Identity */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'fadeIn 0.6s ease-out' }}>
          <div style={{
             width: '88px', height: '88px', borderRadius: '50%',
             background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.05) 100%)',
             border: '1px solid rgba(59,130,246,0.3)',
             boxShadow: '0 8px 32px rgba(59,130,246,0.15)',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             margin: '0 auto 1.5rem', color: '#60a5fa'
          }}>
            <Smartphone size={40} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>Nexus Relay</h2>
          <div style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {lang === 'cz' ? 'Profil:' : 'Profile:'}
            <span style={{ color: '#f8fafc', fontWeight: '600', padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', letterSpacing: '0.02em' }}>
              {operator?.name || operator?.email || 'Modelka'}
            </span>
          </div>
        </div>

        {/* Main Status Card */}
        <div style={{
          width: '100%', maxWidth: '340px',
          padding: '2rem 1.5rem', borderRadius: '24px',
          background: isActive ? 'linear-gradient(145deg, rgba(34,197,94,0.1) 0%, rgba(21,128,61,0.02) 100%)' : 'linear-gradient(145deg, rgba(239,68,68,0.1) 0%, rgba(185,28,28,0.02) 100%)',
          border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          boxShadow: `0 8px 32px ${isActive ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)'}`,
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
          marginBottom: '2rem',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'fadeIn 0.7s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: isActive ? '#4ade80' : '#f87171',
              animation: isActive ? 'pulseIndicator 2s infinite' : 'none'
            }} />
            <span style={{ fontWeight: '700', fontSize: '1.15rem', color: isActive ? '#4ade80' : '#f87171', letterSpacing: '0.05em' }}>
              {isActive ? (lang === 'cz' ? 'AKTIVNÍ' : 'ACTIVE') : (lang === 'cz' ? 'POZASTAVENO' : 'PAUSED')}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
            {lang === 'cz'
              ? 'Telefon automaticky přeposílá SMS zprávy a hovory do systému Nexus.'
              : 'This phone is automatically forwarding SMS and calls to the Nexus system.'}
          </p>
        </div>

        {/* System Indicators */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem',
          width: '100%', maxWidth: '340px', marginBottom: 'auto',
          animation: 'fadeIn 0.8s ease-out'
        }}>
          {/* Battery */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
            padding: '1.25rem 1rem', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Battery size={26} color={batteryLevel > 20 ? '#4ade80' : '#f87171'} strokeWidth={1.5} />
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '500' }}>{batteryLevel}% {isCharging && '⚡'}</span>
          </div>

          {/* Setup / Config */}
          <div
            onClick={runSetupWizard}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
              padding: '1.25rem 1rem', borderRadius: '20px',
              background: allSetupOk ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${allSetupOk ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.3)'}`,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <ShieldCheck size={26} color={allSetupOk ? '#4ade80' : '#f87171'} strokeWidth={1.5} />
            <span style={{ fontSize: '0.85rem', color: allSetupOk ? '#4ade80' : '#f87171', fontWeight: '600', textAlign: 'center' }}>
              {allSetupOk ? 'Oprávnění OK' : (setupRunning ? 'Nastavuji...' : 'Chyba v nastavení')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem', animation: 'fadeIn 0.9s ease-out' }}>
          <button
            onClick={() => setIsActive(v => !v)}
            style={{
              padding: '1.15rem', borderRadius: '18px',
              background: isActive ? 'rgba(255,255,255,0.05)' : '#3b82f6',
              border: isActive ? '1px solid rgba(255,255,255,0.1)' : 'none',
              color: 'white', fontWeight: '600', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? 'none' : '0 8px 25px rgba(59,130,246,0.4)'
            }}
          >
            {isActive ? <Pause size={20} strokeWidth={2.5} /> : <Play size={20} strokeWidth={2.5} />}
            {isActive ? (lang === 'cz' ? 'Pozastavit Relay' : 'Pause Relay') : (lang === 'cz' ? 'Spustit Relay' : 'Start Relay')}
          </button>

          <button
            onClick={onLogout}
            style={{
              padding: '1.15rem', borderRadius: '18px',
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontWeight: '600', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              opacity: 0.8
            }}
          >
            {lang === 'cz' ? 'Odhlásit zařízení' : 'Logout device'}
          </button>
        </div>
      </div>
</>
  );
}"""

with open("client/src/RelayApp.jsx", "w") as f:
    f.write(content.replace(dashboard_ui_match.group(0), new_ui))
