import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from 'lucide-react';
import { useSipCall } from '../plugins/NexusSip';
import { useInCallService, isInCallAvailable } from '../plugins/NexusInCall';
import { useSmsRelay } from '../plugins/NexusSms';
import IncomingCallScreen from './sip/IncomingCallScreen';
import ActiveCallScreen from './sip/ActiveCallScreen';
import IncomingCallModal from './IncomingCallModal';
import IncomingSmsModal from './IncomingSmsModal';
import axios from 'axios';


import { useNexus } from '../context/ContextHook';

const RelayMode = ({ operator, t, onHide, onExit, syncPushToken, isSyncingPush, requestRelayPermissions, processRelayOutbox, syncSmsHistory }) => {
  const nexus = useNexus();
  const { 
    isRelayActive: isActive, 
    setIsRelayActive: setIsActive, 
    relaySimSlot: selectedSimSlot, 
    setRelaySimSlot: setSelectedSimSlot,
    relayLogs: logs,
    setRelayLogs: setLogs,
    addRelayLog: addLocalLog,
    API_BASE,
    lang,
    setLang
  } = nexus || {};

  const isMobile = window.innerWidth <= 768;
  const RELAY_API_BASE = (import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api').replace(/\/api$/, '');


  const updateLogStatus = useCallback((idOrPhone, newStatus) => {
    relayDebug('updateLogStatus', { idOrPhone, newStatus });
    setLogs(prev => {
      const updated = prev.map(l => (l.id === idOrPhone || l.from === idOrPhone) ? { ...l, status: newStatus } : l);
      localStorage.setItem('nexus_relay_logs', JSON.stringify(updated));
      return updated;
    });
  }, [setLogs]);

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [signalStrength, setSignalStrength] = useState(85);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);


  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsBatteryWarning, setSettingsBatteryWarning] = useState(true);
  const [settingsTrafficProxy, setSettingsTrafficProxy] = useState(true);
  const [settingsHiddenMode, setSettingsHiddenMode] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState({
    smsMonitoring: false,
    callMonitoring: false,
    locationMonitoring: false,
    rcsMonitoring: false
  });
  const [relayNotice, setRelayNotice] = useState(null);
  const [showTestSmsConfirm, setShowTestSmsConfirm] = useState(false);
  const [_noProfileWarning] = useState(false);
  const latestHealthCheckRef = useRef(0);
  const consecutiveHealthFailuresRef = useRef(0);
  const POLL_FAILURES_FOR_DISCONNECT = 5;

  // ── SIP VoIP integration ────────────────────────────────────────────────────


  // Fake call handler
  useEffect(() => {
    const handleFakeCall = (data) => {
      const myInstallationId = operator?.installationId;
      if (data.targetInstallationId && data.targetInstallationId !== myInstallationId) return;
      const delay = (data.delay || 0) * 1000;
      setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500, 1000]);
        addLocalLog('call', 'System', 'Fake call received', 'inbound', 'forwarded');
      }, delay);
    };
    if (window._nexusSocket) {
      window._nexusSocket.on('fake_call_request', handleFakeCall);
      return () => window._nexusSocket.off('fake_call_request', handleFakeCall);
    }
  }, [operator?.installationId, addLocalLog]);

  // ── Automatic Refresh on New Message ──
  useEffect(() => {
    const handleNewMessage = (data) => {
      // If we are in relay mode for a specific profile, only refresh if it matches
      if (operator?.profileId && data.profileId === operator.profileId) {
        void refreshLogs();
      } else if (!operator?.profileId) {
        // If we are global relay (not tied to profile yet), refresh anyway
        void refreshLogs();
      }
    };
    if (window._nexusSocket) {
      window._nexusSocket.on('new_message', handleNewMessage);
      return () => window._nexusSocket.off('new_message', handleNewMessage);
    }
  }, [operator?.profileId, refreshLogs]);

  // ── Pull to Refresh logic ──
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = (_err) => {
    const scrollEl = document.querySelector('.relay-logs-scroll');
    if (scrollEl && scrollEl.scrollTop === 0) {
      pullStartRef.current = _err.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (_err) => {
    if (!isPullingRef.current) return;
    const currentY = _err.touches[0].clientY;
    const distance = currentY - pullStartRef.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.4, 80));
      if (distance > 10) _err.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (isPullingRef.current) {
      if (pullDistance > 60) {
        void refreshLogs();
      }
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  // ── SIP VoIP integration ────────────────────────────────────────────────────
  const [sipConfig, setSipConfig] = useState(null);
  const sipFetchedRef = useRef(false);

  // Fetch SIP credentials when relay activates
  useEffect(() => {
    if (!isActive || !operator?.token || sipFetchedRef.current) return;
    sipFetchedRef.current = true;
    (async () => {
      try {
        const url = `${API_BASE || RELAY_API_BASE}/sip/config`;
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${operator.token}`,
            'x-installation-id': operator.installationId || '',
          },
        });
        if (res.data?.ok && res.data.sipConfig) {
          setSipConfig(res.data.sipConfig);
        }
      } catch (_err) {
        console.warn('[Relay/SIP] Could not fetch SIP config:', _err.message);
      }
    })();
  }, [isActive, operator?.token, operator?.installationId, API_BASE, RELAY_API_BASE]);

  // Reset SIP on deactivation
  useEffect(() => {
    if (!isActive) {
      setSipConfig(null);
      sipFetchedRef.current = false;
    }
  }, [isActive]);

  const handleSipCallAnswered = useCallback(() => {
    addLocalLog('call', 'SIP', 'SIP call answered', 'inbound', 'forwarded');
  }, [addLocalLog]);

  const handleSipCallEnded = useCallback(() => {
    addLocalLog('call', 'SIP', 'SIP call ended', 'inbound', 'forwarded');
  }, [addLocalLog]);

  const {
    sipState,
    incomingCall: sipIncomingCall,
    answer: sipAnswer,
    reject: sipReject,
    hangup: sipHangup,
  } = useSipCall(sipConfig, {
    onIncoming: (data) => {
      addLocalLog('call', data.caller || data.callerId || 'SIP', 'Incoming SIP call', 'inbound', 'pending');
    },
    onAnswered: handleSipCallAnswered,
    onEnded: handleSipCallEnded,
  });

  // ── InCallService (GSM hovory bez SIP Trunk) ──────────────────────────────
  // Funguje pouze pokud je Nexus nastaven jako výchozí telefonní aplikace.
  const {
    incomingCall: gsmIncomingCall,
    callState:    gsmCallState,
    callDuration: gsmCallDuration,
    isDefaultDialer,
    answer:       gsmAnswer,
    reject:       gsmReject,
    hangup:       gsmHangup,
    setMuted:     gsmSetMuted,
    setSpeaker:   gsmSetSpeaker,
    requestDefaultDialer,
  } = useInCallService({
    onIncoming: (call) => addLocalLog('call', call.callerId, 'GSM hovor (příchozí)', 'inbound', 'ringing'),
    onAnswered: ()     => addLocalLog('call', 'GSM', 'Hovor přijat operátorem', 'inbound', 'answered'),
    onEnded:    ()     => addLocalLog('call', 'GSM', 'Hovor ukončen', 'inbound', 'completed'),
  });

  const { isDefaultSmsApp, requestDefaultSmsApp, incomingSms, clearIncomingSms, sendSms } = useSmsRelay({
    onIncoming: (sms) => addLocalLog('sms', sms.from, 'Příchozí SMS (GSM)', 'inbound', 'completed'),
    socket: nexus.socket
  });

  // Persist logs to localStorage whenever they change

  useEffect(() => {
    try { localStorage.setItem('nexus_relay_logs', JSON.stringify(logs.slice(0, 20))); } catch { /* ignore */ }
  }, [logs]);

  // Sync lang from localStorage in case user changes language while relay is running
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem('nexus_lang') || 'cz';
      setLang(prev => prev !== current ? current : prev);
    }, 2000);
    return () => clearInterval(interval);
  }, [setLang]);

  // Persist SIM slot preference
  useEffect(() => {
    localStorage.setItem('nexus_relay_sim_slot', selectedSimSlot);
  }, [selectedSimSlot]);

  const HEALTH_CHECK_TIMEOUT_MS = 8000;
  const MANUAL_RETRY_ATTEMPTS = 3;
  const relayDebug = (...args) => console.info('[Relay]', ...args);

  const connectionUi = {
    connected: {
      label: t('relayConnected') || 'CONNECTED',
      color: 'var(--success-color)',
      icon: Server
    },
    connecting: {
      label: t('relayConnecting') || 'CONNECTING',
      color: 'var(--accent-color)',
      icon: RefreshCw
    },
    disconnected: {
      label: t('relayDisconnected') || 'DISCONNECTED',
      color: 'var(--_err-color)',
      icon: AlertCircle
    }
  };

  const currentConnectionUi = connectionUi[connectionStatus] || connectionUi.disconnected;
  const isServerConnected = connectionStatus === 'connected';

  const toggleRelayActive = () => {
    setIsActive(prev => {
      const nextIsActive = !prev;

      if (!nextIsActive) {
        // Invalidate any in-flight health check so paused mode stays visually disconnected.
        latestHealthCheckRef.current += 1;
        consecutiveHealthFailuresRef.current = 0;
        setConnectionStatus('disconnected');
      }

      return nextIsActive;
    });
  };

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
    } catch (_err) {
      console.warn('[Relay] Failed to read battery level', _err);
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

  const checkServerConnection = useCallback(async ({ showConnectingState = true, source = 'manual', attempts = 1 } = {}) => {
    const checkId = Math.random().toString(36).substring(7);
    relayDebug('checkServerConnection:start', { source, attempts, showConnectingState, checkId, isActive });
    
    if (!isActive) return false;
    if (showConnectingState) setConnectionStatus('connecting');

    // 1. Try local status if available (Nexus Bridge / Capacitor)
    const relayStatus = await nexus?.checkRelayStatus?.();
    relayDebug('checkServerConnection:deviceStatus', relayStatus);
    
    if (relayStatus?.connected && relayStatus?.bridgeActive) {
      setConnectionStatus('connected');
      latestHealthCheckRef.current = Date.now();
      consecutiveHealthFailuresRef.current = 0;
      relayDebug('checkServerConnection:connected-via-device-status');
      return true;
    }

    // 2. Try profile health via nexus context
    const profileStatus = await nexus?.checkProfileHealth?.(operator?.profileId);
    relayDebug('checkServerConnection:profileStatus', profileStatus);
    if (profileStatus?.isHealthy) {
      setConnectionStatus('connected');
      latestHealthCheckRef.current = Date.now();
      consecutiveHealthFailuresRef.current = 0;
      relayDebug('checkServerConnection:connected-via-profiles');
      return true;
    }

    // 3. Last resort: Direct health check to relay server
    let lastError = null;
    const failureThreshold = source === 'poll' ? POLL_FAILURES_FOR_DISCONNECT : 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`${RELAY_API_BASE}/health`, { 
          mode: 'no-cors',
          cache: 'no-cache',
          headers: { 'x-nexus-check': checkId },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // With no-cors, we can't see status, but if it didn't throw, it reached the server
        setConnectionStatus('connected');
        latestHealthCheckRef.current = Date.now();
        consecutiveHealthFailuresRef.current = 0;
        relayDebug('checkServerConnection:connected-via-health', { attempt, status: response.status });
        return true;
      } catch (_err) {
        lastError = _err;
        relayDebug('checkServerConnection:health-attempt-failed', { attempt, _err: String(lastError) });
        
        if (attempt < attempts) {
          await new Promise(resolve => setTimeout(resolve, 650));
        }
      }
    }

    // Final failure logic
    consecutiveHealthFailuresRef.current += 1;
    if (consecutiveHealthFailuresRef.current >= failureThreshold) {
      console.warn('[Relay] Server is unreachable', lastError);
      setConnectionStatus('disconnected');
    } else {
      console.warn(`[Relay] Transient health check failure (${consecutiveHealthFailuresRef.current}/${failureThreshold})`);
    }

    relayDebug('checkServerConnection:failed', {
      source,
      attempts,
      consecutiveFailures: consecutiveHealthFailuresRef.current,
      _err: String(lastError || 'unknown')
    });
    return false;
  }, [isActive, nexus, operator?.profileId, RELAY_API_BASE]);

  const reconnectServer = async () => {
    relayDebug('reconnectServer:clicked');
    setIsRefreshing(true);
    let connected = await checkServerConnection({ source: 'manual', attempts: MANUAL_RETRY_ATTEMPTS });
    let pushSyncReachedServer = false;

    if (typeof syncPushToken === 'function') {
      try {
        pushSyncReachedServer = await syncPushToken();
      } catch (_err) {
        console.warn('[Relay] Push token sync failed during reconnect', _err);
      }
    }

    if (!connected && pushSyncReachedServer) {
      connected = true;
      consecutiveHealthFailuresRef.current = 0;
      setConnectionStatus('connected');
      showRelayNotice(t('relayConnectedViaApi') || 'Server API responded successfully. Relay stays connected.', 'success');
    }

    if (connected && typeof processRelayOutbox === 'function' && operator?.profileId) {
      void processRelayOutbox(operator.profileId);
    }

    if (connected && typeof syncSmsHistory === 'function' && operator?.profileId) {
      void syncSmsHistory(operator.profileId);
    }

    setIsRefreshing(false);
    if (!connected) {
      showRelayNotice(t('relayServerUnreachable') || 'Server is unreachable. Check internet connection and try again.', 'error');
    }
    relayDebug('reconnectServer:result', { connected, pushSyncReachedServer });
  };

  useEffect(() => {
    if (!isActive) {
      consecutiveHealthFailuresRef.current = 0;
      setConnectionStatus('disconnected');
      return;
    }

    void checkServerConnection({ source: 'manual' });

    const interval = setInterval(() => {
      void checkServerConnection({ showConnectingState: false, source: 'poll' });
    }, 30000);

    return () => clearInterval(interval);
  }, [isActive, checkServerConnection]);

  const testSms = () => {
    // Open in-app confirm dialog instead of window.confirm (crashes Android WebView)
    setShowTestSmsConfirm(true);
  };

  const executeSendTestSms = async () => {
    setShowTestSmsConfirm(false);
    const testNum = operator?.phoneNumber || "+420777777777";
    const testMsg = "Nexus Relay Diagnostic - " + new Date().toLocaleTimeString();
    addLocalLog("sms", testNum, "TEST: " + testMsg, "outbound", "pending");
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (!plugin) throw new Error("Relay plugin not available");
      await plugin.sendSms({ to: testNum, text: testMsg });
      updateLogStatus(testNum, "sent");
    } catch {
      setBatteryLevel(100);
      setIsCharging(false);
    }
  };

  useEffect(() => {
    // 1. Listen for background events from native plugin
    const plugin = window.Capacitor?.Plugins?.NexusRelay;
    let listener = null;
    
    if (plugin?.addListener) {
      listener = plugin.addListener('relay_event', (event) => {
        try {
          const st = (event.status || '').toLowerCase();
          if (st === 'sent' || st === 'forwarded' || st === 'relayed' || st === 'ok' || st === 'success' || st === 'delivered') {
            updateLogStatus(event.from, 'forwarded');
            showRelayNotice(t('smsRelayed') || 'SMS byla odeslána!', 'success');
          } else if (event.status === 'failed' || event.status === '_err') {
            updateLogStatus(event.from, 'failed');
            showRelayNotice(t('relayFailed') || 'Přeposlání selhalo!', 'error');
          } else {
            addLocalLog(event.type || 'sms', event.from, event.content, event.direction || 'inbound', 'pending');
          }
        } catch (_err) {
          console.error('[Relay] relay_event handler _err:', _err);
        }
      });
    }

    return () => {
      if (listener) listener.remove();
    };
  }, [isActive, updateLogStatus, addLocalLog, showRelayNotice, t]);

  const syncRelayToServer = useCallback(async () => {
    if (!operator?.token || !isActive) return;
    const installationId = localStorage.getItem('nexus_installation_id');
    if (!installationId) return;

    try {
      let model = 'Web/Unknown';
      let platform = 'android';
      let deviceName = '';

      if (window.Capacitor?.isNativePlatform()) {
        const info = await window.Capacitor.Plugins.Device.getInfo();
        model = info.model;
        platform = info.platform;
        deviceName = info.name;
      }

      await axios.post(`${RELAY_API_BASE}/api/device/verify`, {
        installationId,
        profileId: operator?.profileId,
        platform,
        model,
        deviceName
      }, {
        headers: { Authorization: `Bearer ${operator?.token}` }
      });
      console.log('[Relay] Server binding verified successfully');
      setConnectionStatus('connected');
    } catch (_err) {
      console.warn('[Relay] Failed to verify server binding', _err);
      setConnectionStatus('_err');
    }
  }, [operator, isActive, RELAY_API_BASE]);


  useEffect(() => {
    // Also wake up the server so it knows this device is active today.
    if (isActive) {
      void syncRelayToServer();
    }
  }, [isActive, syncRelayToServer]);

  const handleExitMode = async () => {
    setConnectionStatus('disconnected');
    // We NO LONGER disable the relay on exit, it stays active in background!
    if (typeof onExit === 'function') {
      onExit();
    }
  };

  useEffect(() => {
    if (window.Capacitor?.Plugins?.NexusRelay) {
      const checkBlacklist = async (phone) => {
        try {
          const url = `${API_BASE || RELAY_API_BASE}/blacklist/check`;
          const res = await axios.get(url, {
            params: { phone },
            headers: { Authorization: `Bearer ${operator?.token}` }
          });
          if (res.data?.found) {
            const entry = res.data.entry;
            const severity = entry.severity === 'danger' ? '🔴' : '⚠️';
            const name = entry.name ? ` (${entry.name})` : '';
            addLocalLog('warning', phone, `${severity} BLACKLIST: ${phone}${name} — ${entry.description || ''}`, 'inbound', 'forwarded');
          }
        } catch (_err) { console.error(_err); }
      };

      const smsListener = window.Capacitor.Plugins.NexusRelay.addListener('onSmsReceived', async (data) => {
        try {
          addLocalLog('sms', data.from, data.body, 'inbound', 'pending');
          checkBlacklist(data.from);
          // Also forward to server (in case native plugin doesn't do it automatically)
          const installationId = localStorage.getItem('nexus_installation_id');
          const token = localStorage.getItem('nexus_token');
          if (installationId && token) {
            try {
              const res = await fetch(`${RELAY_API_BASE}/api/device/relay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                  installationId,
                  secret: import.meta.env.VITE_DEVICE_SECRET || '',
                  from: data.from,
                  content: data.body,
                  type: 'SMS_RECEIVED',
                  transport: 'sms',
                  direction: 'inbound'
                })
              });
              if (!res.ok) throw new Error(`Server returned ${res.status}`);
              updateLogStatus(data.from, 'forwarded');
              showRelayNotice(lang === 'cz' ? 'SMS přeposlána na server' : 'SMS forwarded to server', 'success');
            } catch (_err) {
              console.warn('[Relay] Failed to forward SMS to server', _err);
              updateLogStatus(data.from, 'failed');
              showRelayNotice((lang === 'cz' ? 'Chyba přeposílání: ' : 'Forward _err: ') + _err.message, '_err');
            }
          }
        } catch (_err) { console.error('[Relay] onSmsReceived _err:', _err); }
      });
      const rcsListener = window.Capacitor.Plugins.NexusRelay.addListener('onRcsReceived', (data) => {
        try {
          addLocalLog('rcs', data.from, data.body, 'inbound', 'pending');
          checkBlacklist(data.from);
        } catch (_err) { console.error('[Relay] onRcsReceived _err:', _err); }
      });
      const callListener = window.Capacitor.Plugins.NexusRelay.addListener('onCallStateChanged', (data) => {
        try {
          if (data.state && data.state !== 'IDLE') {
            addLocalLog('call', data.from, `State: ${data.state}`);
            if (data.from) checkBlacklist(data.from);
          }
        } catch (_err) { console.error('[Relay] onCallStateChanged _err:', _err); }
      });
      return () => {
        smsListener.remove();
        rcsListener.remove();
        callListener.remove();
      };
    }
  }, [isActive, operator, addLocalLog, API_BASE, RELAY_API_BASE, lang, updateLogStatus, showRelayNotice]);

  useEffect(() => {
    if (!isActive || window.Capacitor?.Plugins?.NexusRelay) return;
    const interval = setInterval(() => {
      setSignalStrength(prev => Math.max(70, Math.min(100, prev + (Math.random() * 10 - 5))));
      void updateBatteryDiagnostics();
    }, 10000);
    return () => clearInterval(interval);
  }, [isActive]);



  const refreshPermissionsStatus = useCallback(async () => {
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (!plugin?.checkStatus) return;
      
      const status = await plugin.checkStatus();
      if (status) {
        setPermissionsStatus({
          smsMonitoring: Boolean(status.smsMonitoring),
          callMonitoring: Boolean(status.callMonitoring),
          locationMonitoring: Boolean(status.locationMonitoring),
          rcsMonitoring: Boolean(status.rcsMonitoring)
        });
      }
    } catch (_err) {
      console.warn('[Relay] Failed to refresh permissions status', _err);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    if (isRefreshingLogs) return;
    setIsRefreshingLogs(true);
    try {
      const installationId = localStorage.getItem('nexus_installation_id');
      const token = localStorage.getItem('nexus_token');
      if (!installationId || !token) {
        setIsRefreshingLogs(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(`${RELAY_API_BASE}/api/device/logs?installationId=${encodeURIComponent(installationId)}&limit=50`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.logs)) {
          const serverLogs = data.logs.map(l => ({
            id: l.id || l.timestamp || Date.now() + Math.random(),
            transport: l.transport || 'sms',
            type: l.transport || 'sms',
            from: l.from || '?',
            content: l.content || '',
            fullData: l.content || '',
            direction: l.direction || 'inbound',
            time: l.time || new Date(l.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: l.status || 'forwarded',
            senderName: l.sender?.name || null
          }));
          // Merge: keep local-only logs (prefixed with 'local_') + server logs
          setLogs(prev => {
            const localOnly = prev.filter(l => String(l.id).startsWith('local_'));
            const merged = [...serverLogs];
            localOnly.forEach(local => {
              if (!merged.find(s => s.content === local.content && s.from === local.from)) {
                merged.unshift(local);
              }
            });
            return merged.slice(0, 30);
          });
        }
      }
    } catch (_err) {
      console.warn('[Relay] Failed to refresh logs', _err);
    } finally {
      setIsRefreshingLogs(false);
    }
  }, [RELAY_API_BASE, isRefreshingLogs, setLogs]);

  // Load initial permissions status and start polling
  useEffect(() => {
    void refreshPermissionsStatus();
    // Also load logs immediately on mount/activation
    if (isActive) {
      void refreshLogs();
    }

    const interval = setInterval(() => {
      if (isActive) {
        void refreshPermissionsStatus();
        void refreshLogs(); // Auto-refresh logs every 10s along with permissions
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [isActive, refreshPermissionsStatus, refreshLogs]);

  const showRelayNotice = useCallback((type, message) => {
    relayDebug('showRelayNotice', { type, message });
    setRelayNotice({ type, message });
  }, []);

  useEffect(() => {
    if (!relayNotice) return;
    const timer = setTimeout(() => setRelayNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [relayNotice]);

  return (
    <>
      {/* IncomingCallModal: GSM hovor zachycený přes InCallService (bez SIP Trunk) */}
      {isInCallAvailable() && (gsmCallState === 'ringing' || gsmCallState === 'active') && (
        <IncomingCallModal
          incomingCall={gsmIncomingCall}
          callState={gsmCallState}
          callDuration={gsmCallDuration}
          onAnswer={gsmAnswer}
          onReject={gsmReject}
          onHangup={gsmHangup}
          onMute={gsmSetMuted}
          onSpeaker={gsmSetSpeaker}
          lang={lang}
        />
      )}

      {/* IncomingSmsModal: příchozí SMS */}
      <IncomingSmsModal
        sms={incomingSms}
        onClose={clearIncomingSms}
        onReply={(text) => sendSms(incomingSms.from, text)}
        lang={lang}
      />

      {/* In-app Test SMS confirm dialog (window.confirm crashes Android WebView) */}

      {showTestSmsConfirm && (
        <div
          onClick={() => setShowTestSmsConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
          }}
        >
          <div
            onClick={_err => _err.stopPropagation()}
            style={{
              background: '#12141a', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '320px',
              display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageSquare size={22} color="var(--accent-color)" />
              <span style={{ fontWeight: '900', fontSize: '1rem' }}>
                {lang === 'cz' ? 'Testovací SMS' : 'Test SMS'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {lang === 'cz'
                ? 'Odeslat diagnostickou SMS pro ověření funkčnosti Relay pluginu?'
                : 'Send a diagnostic SMS to verify Relay plugin functionality?'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowTestSmsConfirm(false)}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)',
                  color: 'var(--text-secondary)', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {lang === 'cz' ? 'ZRUŠIT' : 'CANCEL'}
              </button>
              <button
                onClick={executeSendTestSms}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '12px',
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
                  color: 'var(--accent-color)', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {lang === 'cz' ? 'ODESLAT' : 'SEND'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIP incoming call fullscreen overlay */}
      {sipState === 'ringing' && sipIncomingCall && (
        <IncomingCallScreen
          caller={sipIncomingCall.caller || sipIncomingCall.callerId}
          profileName={sipIncomingCall.callerName}
          onAnswer={() => sipAnswer()}
          onReject={() => sipReject()}
        />
      )}

      {/* SIP active call fullscreen overlay */}
      {sipState === 'in_call' && (
        <ActiveCallScreen
          caller={sipIncomingCall?.caller || 'SIP'}
          profileName={sipIncomingCall?.callerName}
          onEnd={() => sipHangup()}
        />
      )}

    <div className="relay-container fade-in" style={{ 
      minHeight: '100dvh',
      background: '#07080a',
      color: 'white', 
      paddingTop: isMobile ? '0.5rem' : '1.25rem',
      paddingLeft: '1.5rem',
      paddingRight: '1.5rem',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      position: 'relative',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Diagnostics / Test Section */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: '900', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('relayDiagnostics') || (lang === 'cz' ? 'DIAGNOSTIKA RELAY' : 'RELAY DIAGNOSTICS')}
          </div>
          <Activity size={16} color="var(--text-secondary)" />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={testSms}
            style={{ 
              flex: 1, 
              padding: '0.85rem', 
              borderRadius: '12px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              border: '1px solid rgba(59, 130, 246, 0.3)', 
              color: 'var(--accent-color)', 
              fontSize: '0.75rem', 
              fontWeight: '950',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {t('runSmsTest') || (lang === 'cz' ? 'TESTOVACÍ SMS' : 'TEST SMS')}
          </button>
          <button 
            onClick={refreshDiagnostics}
            style={{ 
              flex: 1, 
              padding: '0.85rem', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid var(--card-border)', 
              color: 'var(--text-secondary)', 
              fontSize: '0.75rem', 
              fontWeight: '950',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {t('refreshHealth') || (lang === 'cz' ? 'OBNOVIT STAV' : 'REFRESH STATUS')}
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={24} className={(connectionStatus === 'connecting' || isRefreshing) ? 'rotate' : ''} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '0.05em' }}>{t('relayTitle') || 'NEXUS RELAY'}</h2>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{t('relayDeviceIdLabel') || 'DEVICE ID'}: {operator?.id?.toUpperCase() || 'RELAY-01'}</div>
          </div>
        </div>
        <button 
          onClick={toggleRelayActive}
          style={{
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            border: 'none', 
            background: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isActive ? 'var(--success-color)' : 'var(--_err-color)',
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
          { icon: currentConnectionUi.icon, label: t('relayServer') || 'SERVER', value: currentConnectionUi.label, color: currentConnectionUi.color, isStatus: true },
          { icon: Signal, label: t('relaySignal') || 'SIGNAL', value: `${Math.round(signalStrength || 0)}%`, subValue: (selectedSimSlot || 'auto').toUpperCase(), color: isServerConnected ? 'var(--success-color)' : 'var(--text-secondary)' },
          { icon: Battery, label: t('relayBattery') || 'BATTERY', value: `${Math.round(batteryLevel)}%${isCharging ? ' ⚡' : ''}`, color: batteryLevel > 20 ? (isServerConnected ? 'var(--success-color)' : 'var(--text-secondary)') : 'var(--_err-color)' },
          { icon: Activity, label: t('relayUptime') || 'UPTIME', value: t('relayUptimeValue') || '14d 05h', color: isServerConnected ? 'var(--accent-color)' : 'var(--text-secondary)' }
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: card.isStatus ? 'center' : 'flex-start', gap: '0.5rem', width: '100%' }}>
              {card.isStatus && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.color }}></div>}
              <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>{card.value}</span>
              {card.subValue && <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontWeight: '800', marginLeft: 'auto' }}>{card.subValue}</span>}
            </div>
          </div>
        ))}
      </div>


      {/* Permissions Check */}
      <div 
        onClick={async () => {
          if (typeof requestRelayPermissions !== 'function') {
            showRelayNotice(t('relayPermissionUnavailable') || 'Relay permission prompt is unavailable on this platform.', 'error');
            return;
          }
          const status = await requestRelayPermissions();

          // Update permissions status display
          if (status) {
            setPermissionsStatus({
              smsMonitoring: Boolean(status.smsMonitoring),
              callMonitoring: Boolean(status.callMonitoring),
              locationMonitoring: Boolean(status.locationMonitoring),
              rcsMonitoring: Boolean(status.rcsMonitoring)
            });
          }

          if (status?.ready) {
            if (status?.rcsMonitoring) {
              showRelayNotice(t('relayAllPermissionsActive') || 'SMS, phone, location and RCS notification access are granted.', 'success');
              return;
            }
            showRelayNotice((t('relayPermissionsGrantedRcsDisabled') || 'SMS and phone permissions are granted, but RCS notification access is still disabled.') + ' ' + (t('relayUseRcsButtonHint') || 'Use the RCS button below to open Notification Access.'), 'info');
            return;
          }
          showRelayNotice(t('relayPermissionsMissing') || 'Please allow SMS, phone and location permissions to keep Relay monitoring active.', 'error');
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
          {[
            { id: 'smsMonitoring', label: 'SMS', granted: permissionsStatus.smsMonitoring },
            { id: 'callMonitoring', label: 'PHONE', granted: permissionsStatus.callMonitoring },
            { id: 'locationMonitoring', label: 'LOCATION', granted: permissionsStatus.locationMonitoring },
            { id: 'rcsMonitoring', label: 'RCS', granted: permissionsStatus.rcsMonitoring },
            { id: 'sipRegistration', label: 'SIP', granted: sipState === 'registered' || sipState === 'ringing' || sipState === 'in_call' },
          ].map(p => (
            <div
              key={p.id}
              style={{
                fontSize: '0.6rem',
                padding: '0.3rem 0.6rem',
                background: p.granted ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                border: p.granted ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--card-border)',
                color: p.granted ? 'var(--success-color)' : 'var(--text-secondary)',
                fontWeight: '700',
                letterSpacing: '0.04em'
              }}
            >
              {p.label}
            </div>
          ))}
        </div>
        {!permissionsStatus.rcsMonitoring && (
          <button
            onClick={async (event) => {
              event.stopPropagation();
              const relayPlugin = window.Capacitor?.Plugins?.NexusRelay;
              if (!relayPlugin?.openNotificationAccessSettings) {
                showRelayNotice(t('relayPermissionUnavailable') || 'Relay permission prompt is unavailable on this platform.', 'error');
                return;
              }
              await relayPlugin.openNotificationAccessSettings();
            }}
            style={{
              marginTop: '1rem',
              width: '100%',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15))',
              color: '#d8b4fe',
              fontWeight: '950',
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.2)'
            }}
          >
            {t('relayEnableRcsAccess') || (lang === 'cz' ? 'AKTIVOVAT RCS / SMS' : 'ENABLE RCS / SMS')}
          </button>
        )}
        {_noProfileWarning && (
          <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', lineHeight: '1.4', padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: 'var(--_err-color)', fontWeight: '700' }}>
            ❌ {lang === 'cz' ? 'Žádný profil není přiřazen k tomuto zařízení — SMS nebudou uloženy. Odhlaste se, přiřaďte profil a spárujte znovu.' : 'No profile assigned to this device — SMS will not be saved. Log out, assign a profile, then re-pair.'}
          </div>
        )}
        {relayNotice && (
          <div
            style={{
              marginTop: '0.85rem',
              fontSize: '0.72rem',
              lineHeight: '1.4',
              padding: '0.7rem 0.85rem',
              borderRadius: '10px',
              border: relayNotice.type === '_err'
                ? '1px solid rgba(239,68,68,0.35)'
                : (relayNotice.type === 'success'
                  ? '1px solid rgba(34,197,94,0.35)'
                  : '1px solid rgba(59,130,246,0.35)'),
              background: relayNotice.type === '_err'
                ? 'rgba(239,68,68,0.08)'
                : (relayNotice.type === 'success'
                  ? 'rgba(34,197,94,0.08)'
                  : 'rgba(59,130,246,0.08)'),
              color: relayNotice.type === '_err'
                ? 'var(--_err-color)'
                : (relayNotice.type === 'success'
                  ? 'var(--success-color)'
                  : 'var(--accent-color)'),
              fontWeight: '700'
            }}
          >
            {relayNotice.message}
          </div>
        )}
      </div>

      {/* ═══ Manuál: Přijímání hovorů v prohlížeči ═══ */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Phone size={20} color="#c084fc" />
          <span style={{ fontWeight: '800', color: '#e9d5ff', fontSize: '0.95rem' }}>
            {lang === 'cz' ? 'Přijímání hovorů v prohlížeči' : 'Browser Call Answering'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.1em', color: '#c084fc', background: 'rgba(192,132,252,0.15)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
            MANUÁL
          </span>
        </div>

        {/* ── Volba metody ── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { id: 'incall', label: lang === 'cz' ? '📱 Nexus jako telefon' : '📱 Nexus as Dialer', desc: lang === 'cz' ? 'Bez SIP čísla' : 'No SIP number', recommended: true },
            { id: 'sip',    label: lang === 'cz' ? '🔗 Přes SIP Trunk' : '🔗 Via SIP Trunk',   desc: lang === 'cz' ? 'S virtuálním číslem' : 'With virtual number', recommended: false },
          ].map(method => {
            const [activeMethod, setActiveMethod] = typeof window.__relayCallMethod !== 'undefined'
              ? [window.__relayCallMethod, (v) => { window.__relayCallMethod = v; }]
              : ['incall', () => {}];
            return (
              <div
                key={method.id}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '14px', cursor: 'pointer',
                  border: `1px solid ${activeMethod === method.id ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: activeMethod === method.id ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: '800', fontSize: '0.8rem', color: activeMethod === method.id ? '#e9d5ff' : 'var(--text-secondary)', marginBottom: '0.25rem' }}>{method.label}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{method.desc}</div>
                {method.recommended && <div style={{ fontSize: '0.6rem', color: '#c084fc', fontWeight: '900', marginTop: '0.25rem' }}>★ DOPORUČENO</div>}
              </div>
            );
          })}
        </div>

        {/* ── METODA 1: InCallService (bez SIP Trunk) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Banner: stav výchozí aplikace */}
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            background: isDefaultDialer ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${isDefaultDialer ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{isDefaultDialer ? '✅' : '⚠️'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '0.8rem', color: isDefaultDialer ? '#22c55e' : '#f59e0b' }}>
                {isDefaultDialer
                  ? (lang === 'cz' ? 'Nexus je výchozí telefonní aplikace' : 'Nexus is default phone app')
                  : (lang === 'cz' ? 'Nexus NENÍ nastaven jako výchozí telefonní aplikace' : 'Nexus is NOT set as default phone app')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                {isDefaultDialer
                  ? (lang === 'cz' ? 'Příchozí hovory budou zachyceny automaticky.' : 'Incoming calls will be intercepted automatically.')
                  : (lang === 'cz' ? 'Klikněte na tlačítko níže a nastavte Nexus jako výchozí.' : 'Click the button below to set Nexus as default.')}
              </div>
            </div>
            {!isDefaultDialer && (
              <button
                onClick={requestDefaultDialer}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                  color: 'white', fontWeight: '900', fontSize: '0.75rem', whiteSpace: 'nowrap',
                }}
              >
                {lang === 'cz' ? 'Nastavit' : 'Set Now'}
              </button>
            )}
          </div>

          {/* Kroky nastavení */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              {
                n: '1',
                icon: '📲',
                title: lang === 'cz' ? 'Nainstalujte aktuální verzi Nexus Relay' : 'Install latest Nexus Relay',
                desc:  lang === 'cz'
                  ? 'Funkce vyžaduje verzi s podporou InCallService. Zkontrolujte aktualizaci.'
                  : 'Feature requires InCallService support. Check for updates.',
              },
              {
                n: '2',
                icon: '📞',
                title: lang === 'cz' ? 'Nastavte Nexus jako výchozí telefonní aplikaci' : 'Set Nexus as default phone app',
                desc:  lang === 'cz'
                  ? 'Nastavení → Aplikace → Výchozí aplikace → Telefonní aplikace → Nexus Relay. Nebo použijte tlačítko "Nastavit" výše.'
                  : 'Settings → Apps → Default apps → Phone app → Nexus Relay. Or use the "Set Now" button above.',
              },
              {
                n: '3',
                icon: '🎤',
                title: lang === 'cz' ? 'Povolte oprávnění k mikrofonu' : 'Grant microphone permission',
                desc:  lang === 'cz'
                  ? 'Při prvním hovoru vás Android požádá o povolení mikrofonu. Potvrďte "Vždy povolit".'
                  : 'On first call Android will ask for microphone permission. Select "Always allow".',
              },
              {
                n: '4',
                icon: '🌐',
                title: lang === 'cz' ? 'Operátor otevře Nexus v prohlížeči' : 'Operator opens Nexus in browser',
                desc:  lang === 'cz'
                  ? 'Jakmile někdo zavolá, v prohlížeči operátora se automaticky zobrazí popup s tlačítky Přijmout / Odmítnout.'
                  : 'When someone calls, a popup with Answer / Reject buttons will appear in the operator\'s browser.',
              },
            ].map(step => (
              <div key={step.n} style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '0.85rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '900', fontSize: '0.8rem', color: '#c084fc',
                }}>{step.n}</div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.82rem', color: 'white', marginBottom: '0.2rem' }}>
                    {step.icon} {step.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>
              {lang === 'cz' ? 'ALTERNATIVA: PŘESMĚROVÁNÍ PŘES SIP TRUNK' : 'ALTERNATIVE: SIP TRUNK FORWARDING'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontWeight: '900', color: '#c084fc', flexShrink: 0 }}>A.</span>
                <span>
                  {lang === 'cz'
                    ? 'Zřiďte virtuální SIP číslo u poskytovatele (Odorik.cz, Twilio, Fayn...).'
                    : 'Get a virtual SIP number from a provider (Odorik.cz, Twilio, Fayn...).'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontWeight: '900', color: '#c084fc', flexShrink: 0 }}>B.</span>
                <span>
                  {lang === 'cz'
                    ? 'V Nastavení Androidu nastavte přesměrování hovorů vytočením USSD kódu:'
                    : 'In Android settings enable call forwarding by dialing USSD code:'}
                </span>
              </div>

              {/* USSD kódy */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0.85rem', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', fontSize: '0.65rem', fontFamily: 'inherit' }}>
                  {lang === 'cz' ? '# Bezpodmínečné přesměrování (vše ihned):' : '# Unconditional forwarding (everything):'}
                </div>
                <div style={{ color: '#c084fc', fontWeight: '700' }}>**21*+420910XXXXXX#</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', margin: '0.5rem 0', fontSize: '0.65rem', fontFamily: 'inherit' }}>
                  {lang === 'cz' ? '# Jen když nedvíháte:' : '# Only when not answered:'}
                </div>
                <div style={{ color: '#c084fc', fontWeight: '700' }}>**61*+420910XXXXXX#</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', margin: '0.5rem 0 0', fontSize: '0.65rem', fontFamily: 'inherit' }}>
                  {lang === 'cz' ? '# Zrušení přesměrování:' : '# Cancel forwarding:'}
                </div>
                <div style={{ color: '#86efac', fontWeight: '700' }}>##21#</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontWeight: '900', color: '#c084fc', flexShrink: 0 }}>C.</span>
                <span>
                  {lang === 'cz'
                    ? 'V administraci agentury (Nastavení → Agentura → Telekomunikace) zadejte SIP Provider a přihlašovací údaje.'
                    : 'In agency settings (Settings → Agency → Telecommunications) enter SIP Provider and credentials.'}
                </span>
              </div>
            </div>
          </div>

          {/* SIP klapka */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px', alignItems: 'center' }}>
            <Server size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {lang === 'cz' ? 'Vaše SIP klapka:' : 'Your SIP extension:'}
            </span>
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'white', fontWeight: '900', marginLeft: 'auto', fontSize: '0.8rem' }}>
              {operator?.sipUser || 'N/A'}
            </code>
          </div>

          {/* Info note */}
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: '700', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>ℹ️</span>
            <span>
              {lang === 'cz'
                ? 'Metoda "Nexus jako telefon" (InCallService) nevyžaduje žádný SIP Trunk. Zvuk jde přímo z GSM sítě přes telefon na server a do prohlížeče přes WebRTC. Doporučujeme ji pro nejjednodušší nasazení.'
                : '"Nexus as Dialer" (InCallService) requires no SIP Trunk. Audio flows from GSM via the phone to the server and into the browser via WebRTC. Recommended for simplest deployment.'}
            </span>
          </div>
        </div>
      </div>

      {/* ── METODA 2: SMS Relay ── */}
      <div style={{ background: 'rgba(30,30,40,0.8)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <MessageSquare size={22} color="#c084fc" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>
            {lang === 'cz' ? 'ZACHYTÁVÁNÍ SMS' : 'SMS INTERCEPTOR'}
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Banner: stav výchozí aplikace */}
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            background: isDefaultSmsApp ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${isDefaultSmsApp ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{isDefaultSmsApp ? '✅' : '⚠️'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '0.8rem', color: isDefaultSmsApp ? '#22c55e' : '#f59e0b' }}>
                {isDefaultSmsApp
                  ? (lang === 'cz' ? 'Nexus je výchozí SMS aplikace' : 'Nexus is default SMS app')
                  : (lang === 'cz' ? 'Nexus NENÍ nastaven jako výchozí SMS aplikace' : 'Nexus is NOT set as default SMS app')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                {isDefaultSmsApp
                  ? (lang === 'cz' ? 'Příchozí SMS budou zachyceny automaticky.' : 'Incoming SMS will be intercepted automatically.')
                  : (lang === 'cz' ? 'Klikněte na tlačítko níže a nastavte Nexus jako výchozí.' : 'Click the button below to set Nexus as default.')}
              </div>
            </div>
            {!isDefaultSmsApp && (
              <button
                onClick={requestDefaultSmsApp}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                  color: 'white', fontWeight: '900', fontSize: '0.75rem', whiteSpace: 'nowrap',
                }}
              >
                {lang === 'cz' ? 'Nastavit' : 'Set Now'}
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Forwarding Logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={20} color="var(--text-secondary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>{t('forwardingLogs') || 'FORWARDING LOGS'}</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={refreshLogs}
              disabled={isRefreshingLogs}
              style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--accent-color)', fontSize: '0.7rem', fontWeight: '800', cursor: isRefreshingLogs ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isRefreshingLogs ? 0.6 : 1 }}
            >
              <RefreshCw size={12} className={isRefreshingLogs ? 'rotate' : ''} />
              {isRefreshingLogs ? (t('refreshing') || 'REFRESHING...') : (t('refresh') || 'REFRESH')}
            </button>
            <button
              onClick={() => { setLogs([]); localStorage.removeItem('nexus_relay_logs'); }}
              style={{ padding: '0.4rem 0.85rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
            >
              {t('clear') || 'CLEAR'}
            </button>
          </div>
        </div>

        <div 
          className="relay-logs-scroll"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            transition: pullDistance === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            transform: `translateY(${pullDistance}px)`,
            position: 'relative'
          }}
        >
          {pullDistance > 0 && (
            <div style={{ 
              position: 'absolute', 
              top: -40, 
              left: 0, 
              right: 0, 
              display: 'flex', 
              justifyContent: 'center', 
              opacity: pullDistance / 80,
              color: 'var(--accent-color)'
            }}>
              <RefreshCw size={20} className={pullDistance > 60 ? 'rotate' : ''} />
            </div>
          )}
          {logs.length === 0 ? (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', borderStyle: 'dashed' }}>
              <History size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <div>{lang === 'cz' ? 'Zatím nebyly zachyceny žádné logy.' : 'No logs captured yet.'}</div>
              <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', opacity: 0.6 }}>{lang === 'cz' ? 'Historie se objeví automaticky při přeposlání zprávy.' : 'History will appear automatically when messages are relayed.'}</div>
            </div>
          ) : logs.map(log => (
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
                background: (log.transport || log.type) === 'call' ? 'rgba(34, 197, 94, 0.1)' : ((log.transport || log.type) === 'rcs' ? 'rgba(168, 85, 247, 0.14)' : 'rgba(59, 130, 246, 0.1)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (log.transport || log.type) === 'call' ? 'var(--success-color)' : ((log.transport || log.type) === 'rcs' ? '#c084fc' : 'var(--accent-color)')
              }}>
                {(() => {
                  const type = log.transport || log.type;
                  if (type === 'call') return <Phone size={20} />;
                  const isOut = log.direction === 'outbound' || (log.content || '').startsWith('[OUTBOUND]');
                  return isOut ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />;
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.from}</span>
                    <span style={{ fontSize: '0.58rem', padding: '0.15rem 0.4rem', borderRadius: '999px', background: (log.transport || log.type) === 'call' ? 'rgba(34, 197, 94, 0.12)' : ((log.transport || log.type) === 'rcs' ? 'rgba(168, 85, 247, 0.16)' : 'rgba(59, 130, 246, 0.12)'), color: (log.transport || log.type) === 'call' ? 'var(--success-color)' : ((log.transport || log.type) === 'rcs' ? '#c084fc' : 'var(--accent-color)'), fontWeight: '900', letterSpacing: '0.04em' }}>{(log.transport || log.type || 'sms').toUpperCase()}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.time}</div>
                    {log.senderName && (
                      <div style={{ fontSize: '0.58rem', color: 'var(--accent-color)', fontWeight: '900', marginTop: '2px' }}>[{log.senderName.toUpperCase()}]</div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {log.content}
                </p>
              </div>
              <div style={{
                fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '800',
                background: log.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : log.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: log.status === 'failed' ? 'var(--_err-color)' : log.status === 'pending' ? '#f59e0b' : 'var(--success-color)'
              }}>
                {log.status === 'pending'
                  ? (lang === 'cz' ? '📤 Odesílání...' : '📤 Sending...')
                  : log.status === 'failed'
                  ? (lang === 'cz' ? '❌ Selhalo' : '❌ Failed')
                  : (lang === 'cz' ? '✓ Přeposlána' : '✓ Forwarded')}
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
            {(isSyncingPush || isRefreshing) ? (t('relayReconnecting') || 'RECONNECTING...') : (t('relayReconnectServer') || 'RECONNECT SERVER')}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <Settings size={18} /> {t('settings') || 'SETTINGS'}
          </button>
        </div>
        <button
          onClick={() => {
            if (typeof onHide === 'function') {
              onHide();
            }
          }}
          style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--accent-color)', fontWeight: '800', cursor: 'pointer' }}>
          {t('hideRelayDevice')}
        </button>
        <button
          onClick={handleExitMode}
          style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer' }}>
          {t('exitMode') || 'EXIT MODE'}
        </button>
      </div>

      {/* Log Detail Modal */}
      {activeLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setActiveLog(null)}>
          <div style={{ background: '#12141a', border: '1px solid var(--card-border)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={_err => _err.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: (activeLog.transport || activeLog.type) === 'call' ? 'rgba(34,197,94,0.12)' : ((activeLog.transport || activeLog.type) === 'rcs' ? 'rgba(168,85,247,0.16)' : 'rgba(59,130,246,0.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: (activeLog.transport || activeLog.type) === 'call' ? 'var(--success-color)' : ((activeLog.transport || activeLog.type) === 'rcs' ? '#c084fc' : 'var(--accent-color)') }}>
                {(() => {
                  const type = activeLog.transport || activeLog.type;
                  if (type === 'call') return <Phone size={24} />;
                  const isOut = activeLog.direction === 'outbound' || (activeLog.content || '').startsWith('[OUTBOUND]');
                  return isOut ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />;
                })()}
              </div>
              <div>
                <div style={{ fontWeight: '900', fontSize: '1.1rem' }}>{activeLog.from}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {activeLog.time} • {(activeLog.transport || activeLog.type || 'sms').toUpperCase()} 
                  {activeLog.senderName && <span style={{ color: 'var(--accent-color)', fontWeight: '800' }}> • {activeLog.senderName.toUpperCase()}</span>}
                  • {t('relayForwardedToNexus') || 'Forwarded to Nexus'}
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              {activeLog.fullData}
            </div>
            <button onClick={() => setActiveLog(null)} style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'var(--accent-color)', border: 'none', color: 'white', fontWeight: '900', cursor: 'pointer' }}>{t('close') || 'CLOSE'}</button>
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)', zIndex: 9000, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowSettings(false)}>
          <div style={{ 
            background: '#040507', 
            borderTop: '1px solid var(--card-border)', 
            borderTopLeftRadius: '32px', 
            borderTopRightRadius: '32px', 
            width: '100%', 
            height: '100dvh', 
            padding: 'calc(env(safe-area-inset-top, 0px) + 1.5rem) 1.5rem', 
            paddingBottom: isMobile ? '90px' : 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)', 
            boxSizing: 'border-box', 
            display: 'flex', 
            flexDirection: 'column' 
          }} onClick={_err => _err.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: 0 }}
              >
                <ArrowDownLeft size={18} style={{ transform: 'rotate(45deg)' }} />
                {lang === 'cz' ? 'Zpět' : 'Back'}
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0 }}>{t('relaySettingsTitle') || 'Relay Settings'}</h3>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
                {[
                { id: 'apiGateway', label: t('relayApiGateway') || 'API Gateway', sub: `${RELAY_API_BASE}/api/device/relay • ${currentConnectionUi.label}`, icon: currentConnectionUi.icon, iconColor: currentConnectionUi.color, toggle: undefined, onToggle: reconnectServer },
                { id: 'syncHistory', label: lang === 'cz' ? 'Synchronizovat historii' : 'Synchronize History', sub: lang === 'cz' ? 'Stáhnout chybějící SMS z telefonu' : 'Pull missing SMS from phone', icon: History, onToggle: async () => { if (typeof syncSmsHistory === 'function') { showRelayNotice(lang === 'cz' ? 'Synchronizace historie spuštěna...' : 'Syncing history...', 'info'); await syncSmsHistory(); showRelayNotice(lang === 'cz' ? 'Synchronizace dokončena' : 'Sync completed', 'success'); } } },
                { id: 'batteryWarning', label: t('relayBatteryWarning') || 'Battery Warning', sub: t('relayBatteryWarningSub') || 'Alert at 15%', icon: Battery, toggle: settingsBatteryWarning, onToggle: () => setSettingsBatteryWarning(v => !v) },
                { id: 'trafficProxy', label: t('relayTrafficProxy') || 'Traffic Proxy', sub: t('relayTrafficProxySub') || 'Routing through SIM', icon: Wifi, toggle: settingsTrafficProxy, onToggle: () => setSettingsTrafficProxy(v => !v) },
                { 
                  id: 'simSlot', 
                  label: lang === 'cz' ? 'Pracovní SIM karta' : 'Work SIM Card', 
                  sub: selectedSimSlot === 'auto' ? (lang === 'cz' ? 'Automaticky (všechny SIM)' : 'Automatic (all SIMs)') : `SIM ${selectedSimSlot}`, 
                  icon: Phone, 
                  customAction: (
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                      {['auto', '1', '2'].map(slot => (
                        <button 
                          key={slot}
                          onClick={(_err) => { _err.stopPropagation(); setSelectedSimSlot(slot); }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.7rem',
                            fontWeight: '900',
                            borderRadius: '6px',
                            border: 'none',
                            background: selectedSimSlot === slot ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {slot.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )
                },
                { id: 'hiddenMode', label: t('relayHiddenMode') || 'Hidden Mode', sub: t('relayHiddenModeSub') || 'Hide text in logs', icon: Activity, toggle: settingsHiddenMode, onToggle: () => setSettingsHiddenMode(v => !v) }
              ].map((item, i) => (
                <div key={i} onClick={item.onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--card-border)', cursor: item.onToggle ? 'pointer' : 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={18} color={item.iconColor || 'var(--accent-color)'} className={(item.id === 'apiGateway' && connectionStatus === 'connecting') ? 'rotate' : ''} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.sub}</div>
                    </div>
                  </div>
                  {item.customAction ? (
                    item.customAction
                  ) : item.toggle !== undefined ? (
                    <div
                      onClick={_err => { _err.stopPropagation(); item.onToggle(); }}
                      style={{ width: '44px', height: '24px', background: item.toggle ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: item.toggle ? '22px' : '2px', transition: 'all 0.2s ease' }} />
                    </div>
                  ) : <RefreshCw size={16} color="var(--text-secondary)" />}
                </div>
              ))}
            </div>

            <div style={{ padding: '1.25rem 0', marginTop: 'auto' }}>
              <button 
                onClick={(_err) => { _err.stopPropagation(); setShowSettings(false); }}
                style={{ 
                  width: '100%', 
                  padding: '1.4rem', 
                  borderRadius: '20px', 
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', 
                  fontWeight: '950', 
                  cursor: 'pointer', 
                  boxShadow: '0 12px 40px rgba(59, 130, 246, 0.5)',
                  fontSize: '1.1rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                {lang === 'cz' ? 'ZAVŘÍT NASTAVENÍ' : 'CLOSE SETTINGS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default RelayMode;
