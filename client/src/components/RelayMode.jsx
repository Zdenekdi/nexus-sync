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

const RelayMode = ({ operator, t, onExit }) => {
  const [isActive, setIsActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [signalStrength, setSignalStrength] = useState(85);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [logs, setLogs] = useState([
    { id: 1, type: 'sms', from: '+44 7712 345678', content: 'New message from client...', time: '19:42', status: 'forwarded' },
    { id: 2, type: 'call', from: '+420 731 222 333', content: 'Incoming Call (Ringing)', time: '19:35', status: 'logged' }
  ]);
  const [lastForwardedId, setLastForwardedId] = useState(null);

  const forwardData = async (type, from, content) => {
    if (!isActive) return;
    
    const newLog = {
      id: Date.now(),
      type,
      from,
      content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending'
    };

    setLogs(prev => [newLog, ...prev.slice(0, 19)]);

    try {
      // Direct call to Nexus API
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

  // Listen for native events (if running in Capacitor with our custom plugin)
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

  // Simulate live updates for demo if not in native
  useEffect(() => {
    if (!isActive || window.Capacitor?.Plugins?.NexusRelay) return;
    const interval = setInterval(() => {
      setBatteryLevel(prev => Math.min(100, prev + 0.1));
      setSignalStrength(prev => Math.max(70, Math.min(100, prev + (Math.random() * 10 - 5))));
    }, 5000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="relay-container fade-in" style={{ 
      minHeight: '100vh', 
      background: '#0a0b0e', 
      color: 'white', 
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={24} className={isActive ? 'rotate' : ''} />
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
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Server size={18} color="var(--accent-color)" />
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>SERVER</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionStatus === 'connected' ? 'var(--success-color)' : 'var(--error-color)' }}></div>
            <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>{connectionStatus.toUpperCase()}</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Signal size={18} color="var(--success-color)" />
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>SIGNAL</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>{Math.round(signalStrength)}%</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Battery size={18} color={batteryLevel > 20 ? 'var(--success-color)' : 'var(--error-color)'} />
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>BATTERY</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>{Math.round(batteryLevel)}%</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Activity size={18} color="var(--accent-color)" />
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)' }}>UPTIME</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>14d 05h</div>
        </div>
      </div>

      {/* Permissions Check */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={20} color="var(--success-color)" />
            <span style={{ fontWeight: '800' }}>Permissions Active</span>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={20} color="var(--text-secondary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>FORWARDING LOGS</h3>
          </div>
          <button style={{ padding: '0.4rem 0.85rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800' }}>CLEAR</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="custom-scrollbar">
          {logs.map(log => (
            <div key={log.id} style={{ 
              padding: '1rem', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--card-border)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
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
              <div style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', borderRadius: '4px', fontWeight: '800' }}>
                {log.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <Settings size={18} /> SETTINGS
        </button>
        <button 
          onClick={onExit}
          style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: '800' }}>
          EXIT MODE
        </button>
      </div>
    </div>
  );
};

export default RelayMode;
