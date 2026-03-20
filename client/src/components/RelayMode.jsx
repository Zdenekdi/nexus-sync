import React, { useState, useEffect } from 'react';
import { 
  Signal, 
  Wifi, 
  Battery, 
  Activity, 
  History, 
  ShieldCheck, 
  Server, 
  AlertCircle,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Phone,
  MessageSquare
} from 'lucide-react';

const RelayMode = ({ operator, t, onExit, syncPushToken, isSyncingPush, requestRelayPermissions }) => {
  const [isActive, setIsActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [signalStrength, setSignalStrength] = useState(85);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [logs, setLogs] = useState([
    { id: 1, type: 'sms', from: '+44 7712 345678', content: 'New message from client...', time: '19:42', status: 'forwarded', fullData: 'RE: Meeting tonight? I will be there at 8pm.' },
    { id: 2, type: 'call', from: '+420 731 222 333', content: 'Incoming Call (Ringing)', time: '19:35', status: 'logged', fullData: 'Duration: 0s | Reason: Missed' }
  ]);
  const [lastForwardedId, setLastForwardedId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const refreshDiagnostics = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setBatteryLevel(prev => Math.min(100, prev + 0.1));
      setSignalStrength(prev => Math.max(70, Math.min(100, prev + (Math.random() * 6 - 3))));
      setIsRefreshing(false);
    }, 800);
  };

  const forwardData = async (type, from, content) => {
    if (!isActive) return;
    
    const newLog = {
      id: Date.now(),
      type,
      from,
      content,
      fullData: content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending'
    };

    setLogs(prev => [newLog, ...prev.slice(0, 19)]);

    try {
      const response = await fetch('https://nexus-api.myvnc.com/api/device/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: operator?.id || 'RELAY-01',
          type,
          from,
          content,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'forwarded' } : l));
        setLastForwardedId(newLog.id);
      } else {
        throw new Error('Failed to forward');
      }
    } catch (error) {
      console.error('Relay Error:', error);
      setLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'failed' } : l));
    }
  };

  useEffect(() => {
    if (window.Capacitor?.Plugins?.NexusRelay) {
      const smsListener = window.Capacitor.Plugins.NexusRelay.addListener('onSmsReceived', (data) => {
        forwardData('sms', data.from, data.body);
      });
      const callListener = window.Capacitor.Plugins.NexusRelay.addListener('onCallStateChanged', (data) => {
        forwardData('call', data.from, `State: ${data.state}`);
      });
      return () => {
        smsListener.remove();
        callListener.remove();
      };
    }
  }, [isActive, operator]);

  useEffect(() => {
    if (!isActive || window.Capacitor?.Plugins?.NexusRelay) return;
    const interval = setInterval(() => {
      setBatteryLevel(prev => Math.min(100, prev + 0.1));
      setSignalStrength(prev => Math.max(70, Math.min(100, prev + (Math.random() * 10 - 5))));
    }, 10000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="relay-container fade-in" style={{ 
      minHeight: '100vh', 
      background: '#07080a', 
      color: 'white', 
      padding: 'calc(env(safe-area-inset-top, 30px) + 1.5rem) 1.5rem calc(env(safe-area-inset-bottom, 20px) + 5rem)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      position: 'relative',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={24} className={(isActive || isRefreshing) ? 'rotate' : ''} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '0.05em' }}>NEXUS RELAY</h2>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>DEVICE ID: {operator?.id?.toUpperCase() || 'RELAY-01'}</div>
          </div>
        </div>
        <button 
          onClick={() => setIsActive(!isActive)}
          style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            border: 'none', 
            background: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            color: isActive ? 'var(--error-color)' : 'var(--success-color)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
      </div>

      {/* Main Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[
          { icon: Server, label: 'SERVER', value: connectionStatus.toUpperCase(), color: connectionStatus === 'connected' ? 'var(--success-color)' : 'var(--error-color)', isStatus: true },
          { icon: Signal, label: 'SIGNAL', value: `${Math.round(signalStrength)}%`, color: 'var(--success-color)' },
          { icon: Battery, label: 'BATTERY', value: `${Math.round(batteryLevel)}%`, color: batteryLevel > 20 ? 'var(--success-color)' : 'var(--error-color)' },
          { icon: Activity, label: 'UPTIME', value: '14d 05h', color: 'var(--accent-color)' }
        ].map((card, i) => (
          <div 
            key={i} 
            onClick={refreshDiagnostics}
            className="glass-card clickable" 
            style={{ 
              padding: '1.25rem', 
              borderRadius: '20px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--card-border)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: isRefreshing ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <card.icon size={18} color={card.color} className={isRefreshing ? 'rotate' : ''} />
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>{card.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {card.isStatus && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.color }}></div>}
              <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Check */}
      <div 
        onClick={async () => {
          if (typeof requestRelayPermissions !== 'function') {
            alert('Relay permission prompt is unavailable on this platform.');
            return;
          }
          const status = await requestRelayPermissions();
          if (status?.ready) {
            alert('SMS and phone permissions are granted.');
            return;
          }
          alert('Please allow SMS and phone permissions to keep Relay monitoring active.');
        }}
        className="glass-card clickable"
        style={{ padding: '1.5rem', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={20} color="var(--success-color)" />
            <span style={{ fontWeight: '800' }}>{t('permissionsActive') || 'Permissions Active'}</span>
          </div>
          <AlertCircle size={18} color="var(--text-secondary)" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['SMS_READ', 'SMS_RECEIVE', 'PHONE_STATE', 'BACKGROUND_SYNC'].map(p => (
            <div key={p} style={{ fontSize: '0.6rem', padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>{p}</div>
          ))}
        </div>
      </div>

      {/* Forwarding Logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={20} color="var(--text-secondary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>{t('forwardingLogs') || 'FORWARDING LOGS'}</h3>
          </div>
          <button 
            onClick={() => setLogs([])}
            style={{ padding: '0.4rem 0.85rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
          >
            {t('clear') || 'CLEAR'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map(log => (
            <div 
              key={log.id} 
              onClick={() => setActiveLog(log)}
              className="clickable"
              style={{ 
                padding: '1rem', 
                borderRadius: '16px', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--card-border)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                background: log.type === 'sms' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: log.type === 'sms' ? 'var(--accent-color)' : 'var(--success-color)'
              }}>
                {log.type === 'sms' ? <MessageSquare size={20} /> : <Phone size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>{log.from}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.time}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {log.content}
                </p>
              </div>
              <div style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: log.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: log.status === 'failed' ? 'var(--error-color)' : 'var(--success-color)', borderRadius: '4px', fontWeight: '800' }}>
                {log.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto', paddingTop: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button 
            onClick={syncPushToken}
            disabled={isSyncingPush}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <RefreshCw size={18} className={isSyncingPush ? 'rotate' : ''} />
            {isSyncingPush ? 'SYNCING...' : 'FORCE SYNC'}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <Settings size={18} /> {t('settings') || 'SETTINGS'}
          </button>
        </div>
        <button 
          onClick={onExit}
          style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer' }}>
          {t('exitMode') || 'EXIT MODE'}
        </button>
      </div>

      {/* Log Detail Modal */}
      {activeLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setActiveLog(null)}>
          <div style={{ background: '#12141a', border: '1px solid var(--card-border)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                {activeLog.type === 'sms' ? <MessageSquare size={24} /> : <Phone size={24} />}
              </div>
              <div>
                <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>{activeLog.from}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeLog.time} • Forwarded to Nexus</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              {activeLog.fullData}
            </div>
            <button onClick={() => setActiveLog(null)} style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'var(--accent-color)', border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer' }}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowSettings(false)}>
          <div style={{ background: '#12141a', borderTop: '1px solid var(--card-border)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', width: '100%', padding: '2.5rem 1.5rem', maxHeight: '80dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 2.5rem' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem' }}>Relay Settings</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { label: 'API Gateway', sub: 'nexus-api.myvnc.com', icon: Server },
                { label: 'Battery Warning', sub: 'Alert at 15%', icon: Battery, toggle: true },
                { label: 'Traffic Proxy', sub: 'Routing through SIM', icon: Wifi, toggle: true },
                { label: 'Hidden Mode', sub: 'Hide text in logs', icon: Activity, toggle: false }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><item.icon size={20} color="var(--accent-color)" /></div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.sub}</div>
                    </div>
                  </div>
                  {item.toggle !== undefined ? (
                    <div style={{ width: '44px', height: '24px', background: item.toggle ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: item.toggle ? '22px' : '2px', transition: 'all 0.2s ease' }} />
                    </div>
                  ) : <RefreshCw size={16} color="var(--text-secondary)" />}
                </div>
              ))}
            </div>

            <button onClick={() => setShowSettings(false)} style={{ width: '100%', padding: '1.25rem', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', fontWeight: '900', marginTop: '3rem', cursor: 'pointer' }}>SAVE & CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelayMode;
