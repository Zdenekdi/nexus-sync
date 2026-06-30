import re

with open("client/src/RelayApp.jsx", "r") as f:
    content = f.read()

dashboard_match = re.search(r'const RelayDashboard = \(\) => \{.*?(?=\n// ── Root)', content, re.DOTALL)
if not dashboard_match:
    print("Could not find RelayDashboard")
    exit(1)

new_dashboard = """const RelayDashboard = () => {
  const { operator, onLogout, lang, isNativeApp, API_BASE } = useRelay();
  const [isActive, setIsActive] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [permSms, setPermSms] = useState(false);
  const [permDialer, setPermDialer] = useState(false);
  const [isBatOpt, setIsBatOpt] = useState(false);
  const [setupRunning, setSetupRunning] = useState(false);

  // Battery info via native API
  React.useEffect(() => {
    if (typeof navigator?.getBattery === 'function') {
      navigator.getBattery().then(bat => {
        setBatteryLevel(Math.round(bat.level * 100));
        setIsCharging(bat.charging);
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
        bat.addEventListener('chargingchange', () => setIsCharging(bat.charging));
      }).catch(() => {});
    }
  }, []);

  const checkAllStatus = useCallback(async () => {
    const relay = window.Capacitor?.Plugins?.NexusRelay;
    const incall = window.Capacitor?.Plugins?.NexusInCall;
    
    let smsOk = false;
    let dialerOk = false;
    let batOk = false;

    if (relay) {
      const s = await relay.checkStatus?.().catch(() => null);
      if (s) {
        smsOk = Boolean(s.smsMonitoring);
        setPermSms(smsOk);
      }
      const bat = await relay.checkBatteryOptimization?.().catch(() => null);
      if (bat) {
        batOk = Boolean(!bat.optimized);
        setIsBatOpt(batOk);
      }
    }
    
    if (incall) {
      const d = await incall.isDefaultDialer?.().catch(() => null);
      if (d) {
        dialerOk = Boolean(d.isDefault);
        setPermDialer(dialerOk);
      }
    }
    
    return { smsOk, dialerOk, batOk };
  }, []);

  const runSetupWizard = useCallback(async () => {
    if (setupRunning) return;
    setSetupRunning(true);
    try {
      const relay = window.Capacitor?.Plugins?.NexusRelay;
      const incall = window.Capacitor?.Plugins?.NexusInCall;
      if (!relay) return;

      // 1. Standard Permissions (SMS, Location, Phone)
      let s = await relay.ensureReady?.().catch(() => null);
      
      // 2. Default SMS App
      if (s && !s.smsMonitoring) {
        const defRes = await relay.isDefaultSmsApp?.().catch(() => null);
        if (defRes && !defRes.isDefault) {
          await relay.requestDefaultSmsApp?.().catch(() => null);
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // 3. Default Dialer
      if (incall) {
        const d = await incall.isDefaultDialer?.().catch(() => null);
        if (d && !d.isDefault) {
          await incall.requestDefaultDialer?.().catch(() => null);
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // 4. Battery Optimization
      const bat = await relay.checkBatteryOptimization?.().catch(() => null);
      if (bat && bat.optimized) {
        await relay.requestIgnoreBatteryOptimization?.().catch(() => null);
        await new Promise(r => setTimeout(r, 1000));
      }

      await checkAllStatus();
    } finally {
      setSetupRunning(false);
    }
  }, [checkAllStatus, setupRunning]);

  // Initial check and auto-prompt on mount
  React.useEffect(() => {
    checkAllStatus().then((status) => {
      // If any of the essential setup is missing, wait 1.5s then prompt
      if (!status.smsOk || !status.dialerOk || !status.batOk) {
        setTimeout(() => {
           runSetupWizard();
        }, 1500);
      }
    });
  }, [checkAllStatus, runSetupWizard]);

  // SIP calls
  const { sipState, sipIncomingCall, answer: sipAnswer, reject: sipReject, hangup: sipHangup } = useSipCall({
    operator, isActive, API_BASE, isNativeApp,
  });

  // GSM calls via InCallService
  const {
    callState: gsmCallState, incomingCall: gsmIncomingCall, callDuration: gsmCallDuration,
    answer: gsmAnswer, reject: gsmReject, hangup: gsmHangup,
    setMuted: gsmSetMuted, setSpeaker: gsmSetSpeaker,
  } = useInCallService({ operator, isActive, isNativeApp });

  // SMS relay
  const { incomingSms, clearIncomingSms, sendSms } = useSmsRelay({ operator, isActive, isNativeApp, API_BASE });

  const allSetupOk = permSms && permDialer && isBatOpt;

  return (
    <>
      {/* Incoming call modals */}
      <Suspense fallback={null}>
        {isInCallAvailable() && (gsmCallState === 'ringing' || gsmCallState === 'active') && (
          <IncomingCallModal
            incomingCall={gsmIncomingCall} callState={gsmCallState} callDuration={gsmCallDuration}
            onAnswer={gsmAnswer} onReject={gsmReject} onHangup={gsmHangup}
            onMute={gsmSetMuted} onSpeaker={gsmSetSpeaker} lang={lang}
          />
        )}
        <IncomingSmsModal sms={incomingSms} onClose={clearIncomingSms} onReply={text => sendSms(incomingSms.from, text)} lang={lang} />
        {sipState === 'ringing' && sipIncomingCall && (
          <IncomingCallScreen caller={sipIncomingCall.caller || sipIncomingCall.callerId} profileName={sipIncomingCall.callerName} onAnswer={sipAnswer} onReject={sipReject} />
        )}
        {sipState === 'in_call' && (
          <ActiveCallScreen caller={sipIncomingCall?.caller || 'SIP'} profileName={sipIncomingCall?.callerName} onEnd={sipHangup} />
        )}
      </Suspense>

      {/* Main UI */}
      <div style={{ minHeight: '100dvh', background: '#07080a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', boxSizing: 'border-box', gap: '2rem' }}>

        {/* Identity */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color, #3b82f6)' }}>
            <Smartphone size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>NEXUS RELAY</h2>
          <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
            {lang === 'cz' ? 'Připojeno jako:' : 'Connected as:'}{' '}
            <span style={{ color: 'white', fontWeight: '800' }}>{operator?.name || operator?.email || 'Modelka'}</span>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ padding: '1.5rem', borderRadius: '20px', background: isActive ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, width: '100%', maxWidth: '320px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#22c55e' : '#ef4444', boxShadow: `0 0 10px ${isActive ? '#22c55e' : '#ef4444'}` }} />
            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: isActive ? '#22c55e' : '#ef4444' }}>
              {isActive ? (lang === 'cz' ? 'RELAY AKTIVNÍ' : 'RELAY ACTIVE') : (lang === 'cz' ? 'RELAY POZASTAVEN' : 'RELAY PAUSED')}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
            {lang === 'cz'
              ? 'Telefon automaticky přeposílá zprávy a hovory do systému Nexus.'
              : 'This phone automatically forwards messages and calls to the Nexus system.'}
          </p>
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Battery size={16} color={batteryLevel > 20 ? '#22c55e' : '#ef4444'} />
            <span style={{ fontSize: '0.82rem', fontWeight: '800' }}>{batteryLevel}% {isCharging && '⚡'}</span>
          </div>
          <div
            onClick={runSetupWizard}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${allSetupOk ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, cursor: 'pointer' }}
          >
            <ShieldCheck size={16} color={allSetupOk ? '#22c55e' : '#ef4444'} />
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: allSetupOk ? '#22c55e' : '#ef4444' }}>
              {allSetupOk ? 'Nastavení OK' : (setupRunning ? 'Nastavuji...' : (lang === 'cz' ? 'Dokončit nastavení' : 'Complete Setup'))}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Server size={16} color="#3b82f6" />
            <span style={{ fontSize: '0.82rem', fontWeight: '800' }}>API</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={() => setIsActive(v => !v)}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            {isActive ? <Pause size={18} /> : <Play size={18} />}
            {isActive ? (lang === 'cz' ? 'Pozastavit relay' : 'Pause relay') : (lang === 'cz' ? 'Spustit relay' : 'Start relay')}
          </button>
          <button
            onClick={onLogout}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: '900', cursor: 'pointer' }}
          >
            {lang === 'cz' ? 'Odhlásit se' : 'Logout'}
          </button>
        </div>
      </div>
    </>
  );
}"""

with open("client/src/RelayApp.jsx", "w") as f:
    f.write(content.replace(dashboard_match.group(0), new_dashboard))
