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
import { useSipCall, isSipAvailable } from '../plugins/NexusSip';
import IncomingCallScreen from './sip/IncomingCallScreen';
import ActiveCallScreen from './sip/ActiveCallScreen';
import axios from 'axios';

const RelayMode = ({ operator, t, onHide, onExit, syncPushToken, isSyncingPush, requestRelayPermissions, processRelayOutbox, syncSmsHistory }) => {
  const isMobile = window.innerWidth <= 768;
  const RELAY_API_BASE = (import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api').replace(/\/api$/, '');
  const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';
  const [lang, setLang] = useState(() => localStorage.getItem('nexus_lang') || 'cz');
  const [isActive, setIsActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [signalStrength, setSignalStrength] = useState(85);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexus_relay_logs') || '[]'); } catch { return []; }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsBatteryWarning, setSettingsBatteryWarning] = useState(true);
  const [settingsTrafficProxy, setSettingsTrafficProxy] = useState(true);
  const [settingsHiddenMode, setSettingsHiddenMode] = useState(false);
  const [selectedSimSlot, setSelectedSimSlot] = useState(() => localStorage.getItem('nexus_relay_sim_slot') || 'auto'); // 'auto', '1', '2'
  const [permissionsStatus, setPermissionsStatus] = useState({
    smsMonitoring: false,
    callMonitoring: false,
    locationMonitoring: false,
    rcsMonitoring: false
  });
  const [relayNotice, setRelayNotice] = useState(null);
  const [noProfileWarning, setNoProfileWarning] = useState(false);
  const latestHealthCheckRef = useRef(0);
  const consecutiveHealthFailuresRef = useRef(0);
  const POLL_FAILURES_FOR_DISCONNECT = 3;

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
  }, [operator?.installationId]);

  // ── SIP VoIP integration ────────────────────────────────────────────────────
  const [sipConfig, setSipConfig] = useState(null);
  const sipFetchedRef = useRef(false);

  // Fetch SIP credentials when relay activates
  useEffect(() => {
    if (!isActive || !operator?.token || sipFetchedRef.current) return;
    sipFetchedRef.current = true;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/sip/config`, {
          headers: {
            Authorization: `Bearer ${operator.token}`,
            'x-installation-id': operator.installationId || '',
          },
        });
        if (res.data?.ok && res.data.sipConfig) {
          setSipConfig(res.data.sipConfig);
        }
      } catch (err) {
        console.warn('[Relay/SIP] Could not fetch SIP config:', err.message);
      }
    })();
  }, [isActive, operator?.token, API_BASE]);

  // Reset SIP on deactivation
  useEffect(() => {
    if (!isActive) {
      setSipConfig(null);
      sipFetchedRef.current = false;
    }
  }, [isActive]);

  const handleSipCallAnswered = useCallback(() => {
    addLocalLog('call', 'SIP', 'SIP call answered', 'inbound', 'forwarded');
  }, []);

  const handleSipCallEnded = useCallback(() => {
    addLocalLog('call', 'SIP', 'SIP call ended', 'inbound', 'forwarded');
  }, []);

  const {
    sipState,
    incomingCall: sipIncomingCall,
    callDuration: sipCallDuration,
    isMuted: sipIsMuted,
    isSpeaker: sipIsSpeaker,
    answer: sipAnswer,
    reject: sipReject,
    hangup: sipHangup,
    toggleMute: sipToggleMute,
    toggleSpeaker: sipToggleSpeaker,
    permissionWarning: sipPermissionWarning,
  } = useSipCall(sipConfig, {
    onIncoming: (data) => {
      addLocalLog('call', data.caller || data.callerId || 'SIP', 'Incoming SIP call', 'inbound', 'pending');
    },
    onAnswered: handleSipCallAnswered,
    onEnded: handleSipCallEnded,
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
  }, []);

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
      color: 'var(--error-color)',
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

  const checkRelayStatusFromApi = async () => {
    const installationId = localStorage.getItem('nexus_installation_id');
    const token = localStorage.getItem('nexus_token');
    if (!installationId || !token) {
      return { available: false, connected: false, reason: 'missing-installation-or-token' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
      const response = await fetch(`${RELAY_API_BASE}/api/device/status?installationId=${encodeURIComponent(installationId)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { available: true, connected: false, statusCode: response.status, reason: 'device-status-non-ok' };
      }

      const data = await response.json();
      // Check if device has no profile assigned
      if (data?.binding && !data.binding.profileId) {
        setNoProfileWarning(true);
      } else {
        setNoProfileWarning(false);
      }
      return {
        available: true,
        connected: Boolean(data?.online),
        source: data?.source || 'device-binding',
      };
    } catch (error) {
      console.warn('[Relay] Relay status API check failed', error);
      return { available: false, connected: false, reason: 'device-status-error' };
    }
  };

  const checkProfileStatusFromApi = async () => {
    const token = localStorage.getItem('nexus_token');
    if (!token || !operator?.id) {
      return { available: false, connected: false, reason: 'missing-token-or-operator' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
      const response = await fetch(`${RELAY_API_BASE}/api/profiles`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { available: true, connected: false, statusCode: response.status, reason: 'profiles-non-ok' };
      }

      const profiles = await response.json();
      const linkedProfiles = Array.isArray(profiles)
        ? profiles.filter((profile) => {
            if (profile?.id === operator?.profileId) {
              return true;
            }
            return Array.isArray(profile?.assignees) && profile.assignees.some((assignee) => assignee?.id === operator?.id);
          })
        : [];

      return {
        available: true,
        connected: linkedProfiles.some((profile) => `${profile?.status || ''}`.toLowerCase() === 'online'),
        source: 'profiles-db',
      };
    } catch (error) {
      console.warn('[Relay] Profiles API check failed', error);
      return { available: false, connected: false, reason: 'profiles-error' };
    }
  };

  const checkServerConnection = async ({ showConnectingState = true, source = 'manual', attempts = 1 } = {}) => {
    const checkId = ++latestHealthCheckRef.current;
    relayDebug('checkServerConnection:start', { source, attempts, showConnectingState, checkId, isActive });
    if (showConnectingState) {
      setConnectionStatus('connecting');
    }

    const relayStatus = await checkRelayStatusFromApi();
    relayDebug('checkServerConnection:deviceStatus', relayStatus);
    if (relayStatus.available && relayStatus.connected) {
      if (checkId === latestHealthCheckRef.current) {
        consecutiveHealthFailuresRef.current = 0;
        setConnectionStatus('connected');
      }
      relayDebug('checkServerConnection:connected-via-device-status');
      return true;
    }

    const profileStatus = await checkProfileStatusFromApi();
    relayDebug('checkServerConnection:profileStatus', profileStatus);
    if (profileStatus.available && profileStatus.connected) {
      if (checkId === latestHealthCheckRef.current) {
        consecutiveHealthFailuresRef.current = 0;
        setConnectionStatus('connected');
      }
      relayDebug('checkServerConnection:connected-via-profiles');
      return true;
    }

    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
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
          consecutiveHealthFailuresRef.current = 0;
          setConnectionStatus('connected');
        }
        relayDebug('checkServerConnection:connected-via-health', { attempt, status: response.status });
        return true;
      } catch (error) {
        // Fallback for mobile WebView CORS restrictions: treat successful opaque fetch as reachable server.
        try {
          const corsBypassController = new AbortController();
          const bypassTimeoutId = setTimeout(() => corsBypassController.abort(), HEALTH_CHECK_TIMEOUT_MS);
          await fetch(`${RELAY_API_BASE}/health`, {
            method: 'GET',
            cache: 'no-store',
            mode: 'no-cors',
            signal: corsBypassController.signal,
          });
          clearTimeout(bypassTimeoutId);

          if (checkId === latestHealthCheckRef.current) {
            consecutiveHealthFailuresRef.current = 0;
            setConnectionStatus('connected');
          }
          relayDebug('checkServerConnection:connected-via-health-no-cors', { attempt });
          return true;
        } catch (bypassError) {
          lastError = bypassError || error;
          relayDebug('checkServerConnection:health-attempt-failed', { attempt, error: String(lastError) });
        }

        if (attempt < attempts) {
          await new Promise(resolve => setTimeout(resolve, 650));
        }
      }
    }

    if (checkId === latestHealthCheckRef.current) {
      consecutiveHealthFailuresRef.current += 1;
      const failureThreshold = source === 'poll' ? POLL_FAILURES_FOR_DISCONNECT : 1;

      if (consecutiveHealthFailuresRef.current >= failureThreshold) {
        console.warn('[Relay] Server is unreachable', lastError);
        setConnectionStatus('disconnected');
      } else {
        // Keep previous state on early transient failures to avoid false DISCONNECTED flips.
        console.warn(`[Relay] Transient health check failure (${consecutiveHealthFailuresRef.current}/${failureThreshold})`);
      }
    }

    relayDebug('checkServerConnection:failed', {
      source,
      attempts,
      consecutiveFailures: consecutiveHealthFailuresRef.current,
      relayStatus,
      profileStatus,
      error: String(lastError || 'unknown')
    });
    return false;
  };

  const reconnectServer = async () => {
    relayDebug('reconnectServer:clicked');
    setIsRefreshing(true);
    let connected = await checkServerConnection({ source: 'manual', attempts: MANUAL_RETRY_ATTEMPTS });
    let pushSyncReachedServer = false;

    if (typeof syncPushToken === 'function') {
      try {
        pushSyncReachedServer = await syncPushToken();
      } catch (error) {
        console.warn('[Relay] Push token sync failed during reconnect', error);
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

  const normalizeLogType = (log) => {
    if (log?.transport === 'call' || log?.transport === 'sms' || log?.transport === 'rcs') {
      return log.transport;
    }

    if (log?.type === 'call' || log?.type === 'sms' || log?.type === 'rcs') {
      return log.type;
    }

    const stateValue = typeof log?.state === 'string' ? log.state.toUpperCase() : '';
    const contentValue = `${log?.content || log?.body || ''}`.toUpperCase();

    if (log?.sourcePackage === 'com.google.android.apps.messaging') {
      return 'rcs';
    }

    if (
      stateValue === 'RINGING' ||
      stateValue === 'OFFHOOK' ||
      contentValue.startsWith('STATE: RINGING') ||
      contentValue.startsWith('STATE: OFFHOOK')
    ) {
      return 'call';
    }

    return 'sms';
  };

  const addLocalLog = (type, from, content, direction, status = 'pending') => {
    if (!isActive) return;

    const newLog = {
      id: Date.now() + Math.random(),
      transport: type,
      type,
      from: from || 'UNKNOWN',
      content,
      fullData: content,
      direction: direction || (content?.startsWith('[OUTBOUND]') ? 'outbound' : 'inbound'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status
    };

    setLogs(prev => [newLog, ...prev.slice(0, 19)]);
    return newLog.id;
  };

  const updateLogStatus = (from, newStatus) => {
    setLogs(prev => prev.map(l =>
      l.from === from && l.status === 'pending'
        ? { ...l, status: newStatus }
        : l
    ));
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
    }, 15000);

    return () => clearInterval(interval);
  }, [isActive]);

  const testSms = async () => {
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (!plugin) throw new Error('Relay plugin not available');
      
      const testNum = prompt(t('enterTestNumber') || 'Zadejte testovací číslo:', '+420');
      if (!testNum) return;

      const testMsg = 'Nexus Relay Diagnostic Test - ' + new Date().toLocaleTimeString();
      addLocalLog('sms', testNum, 'TEST: ' + testMsg);
      
      await plugin.sendSms({ to: testNum, text: testMsg });
      showRelayNotice(t('testSmsSent') || 'Testovací SMS odeslána!', 'success');
    } catch (e) {
      console.error('[Relay] Test SMS failed', e);
      showRelayNotice(t('testSmsFailed') || 'Chyba při testu SMS: ' + e.message, 'error');
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
          } else if (event.status === 'failed' || event.status === 'error') {
            updateLogStatus(event.from, 'failed');
            showRelayNotice(t('relayFailed') || 'Přeposlání selhalo!', 'error');
          } else {
            addLocalLog(event.type || 'sms', event.from, event.content, event.direction || 'inbound', 'pending');
          }
        } catch (e) {
          console.error('[Relay] relay_event handler error:', e);
        }
      });
    }

    return () => {
      if (listener) listener.remove();
    };
  }, [isActive]);

  const syncRelayToServer = async () => {
    if (!operator?.token || !isActive) return;
    const installationId = localStorage.getItem('nexus_installation_id');
    if (!installationId) return;

    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
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
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[Relay] Server binding verified successfully');
    } catch (error) {
      console.warn('[Relay] Failed to verify server binding', error);
    }
  };

  const syncRelayToNative = async (active) => {
    if (!window.Capacitor?.Plugins?.NexusRelay) return;
    let installationId = localStorage.getItem('nexus_installation_id');
    const currentProfileId = operator?.profileId || localStorage.getItem('nexus_last_profile_id');
    if (operator?.profileId) {
      localStorage.setItem('nexus_last_profile_id', operator.profileId);
    }

    try {
      const baseUrl = `${RELAY_API_BASE}/api/device/relay`;
      await window.Capacitor.Plugins.NexusRelay.configureRelay({
        baseUrl: baseUrl,
        deviceId: operator?.id || 'RELAY-01',
        installationId: installationId || null,
        profileId: currentProfileId || null,
        isActive: active,
        simSlot: selectedSimSlot === 'auto' ? null : parseInt(selectedSimSlot)
      });


      // When activating relay, check if Android battery optimization is blocking
      // background operation and prompt user to disable it.
      if (active) {
        try {
          const batteryResult = await window.Capacitor.Plugins.NexusRelay.checkBatteryOptimization();
          if (batteryResult?.optimized) {
            // Show dialog asynchronously — do not block relay activation
            setTimeout(async () => {
              try {
                await window.Capacitor.Plugins.NexusRelay.requestIgnoreBatteryOptimization();
              } catch (e) {
                console.warn('[Relay] Battery optimization dialog failed', e);
              }
            }, 800);
          }
        } catch (e) {
          // Older OS or plugin version — ignore silently
          console.warn('[Relay] Battery optimization check skipped', e);
        }
      }
    } catch (error) {
      console.warn('[Relay] Failed to sync native relay config', error);
    }
  };

  useEffect(() => {
    // Sync relay status to native side for background forwarding.
    void syncRelayToNative(isActive);
    // Also wake up the server so it knows this device is active today.
    if (isActive) {
      void syncRelayToServer();
    }
  }, [isActive, operator, operator?.token]);

  const handleExitMode = async () => {
    setIsActive(false);
    setConnectionStatus('disconnected');
    await syncRelayToNative(false);
    if (typeof onExit === 'function') {
      onExit();
    }
  };

  useEffect(() => {
    if (window.Capacitor?.Plugins?.NexusRelay) {
      const checkBlacklist = async (phone) => {
        try {
          const res = await axios.get(`${API_BASE}/blacklist/check`, {
            params: { phone },
            headers: { Authorization: `Bearer ${operator?.token}` }
          });
          if (res.data?.found) {
            const entry = res.data.entry;
            const severity = entry.severity === 'danger' ? '🔴' : '⚠️';
            const name = entry.name ? ` (${entry.name})` : '';
            addLocalLog('warning', phone, `${severity} BLACKLIST: ${phone}${name} — ${entry.description || ''}`, 'inbound', 'forwarded');
          }
        } catch {}
      };

      const smsListener = window.Capacitor.Plugins.NexusRelay.addListener('onSmsReceived', (data) => {
        try {
          addLocalLog('sms', data.from, data.body, 'inbound', 'pending');
          checkBlacklist(data.from);
        } catch (e) { console.error('[Relay] onSmsReceived error:', e); }
      });
      const rcsListener = window.Capacitor.Plugins.NexusRelay.addListener('onRcsReceived', (data) => {
        try {
          addLocalLog('rcs', data.from, data.body, 'inbound', 'pending');
          checkBlacklist(data.from);
        } catch (e) { console.error('[Relay] onRcsReceived error:', e); }
      });
      const callListener = window.Capacitor.Plugins.NexusRelay.addListener('onCallStateChanged', (data) => {
        try {
          if (data.state && data.state !== 'IDLE') {
            addLocalLog('call', data.from, `State: ${data.state}`);
            if (data.from) checkBlacklist(data.from);
          }
        } catch (e) { console.error('[Relay] onCallStateChanged error:', e); }
      });
      return () => {
        smsListener.remove();
        rcsListener.remove();
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

  const refreshPermissionsStatus = async () => {
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
    } catch (err) {
      console.warn('[Relay] Failed to refresh permissions status', err);
    }
  };

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
  }, [isActive]);

  const refreshLogs = async () => {
    if (isRefreshingLogs) return;
    setIsRefreshingLogs(true);
    try {
      const installationId = localStorage.getItem('nexus_installation_id');
      const token = localStorage.getItem('nexus_token');
      if (!installationId || !token) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(`${RELAY_API_BASE}/api/device/logs?installationId=${encodeURIComponent(installationId)}&limit=20`, {
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
          setLogs(data.logs.map(l => ({
            id: l.id || l.timestamp || Date.now() + Math.random(),
            transport: l.transport || 'sms',
            type: l.transport || 'sms',
            from: l.from || '?',
            content: l.content || '',
            fullData: l.content || '',
            direction: l.direction || 'inbound',
            time: l.time || new Date(l.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: l.status || 'forwarded'
          })));
        }
      }
    } catch (error) {
      console.warn('[Relay] Failed to refresh logs', error);
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  const showRelayNotice = (message, type = 'info') => {
    if (!message) return;
    setRelayNotice({ message, type });
  };

  useEffect(() => {
    if (!relayNotice) return;
    const timer = setTimeout(() => setRelayNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [relayNotice]);

  return (
    <>
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
          { icon: currentConnectionUi.icon, label: t('relayServer') || 'SERVER', value: currentConnectionUi.label, color: currentConnectionUi.color, isStatus: true },
          { icon: Signal, label: t('relaySignal') || 'SIGNAL', value: `${Math.round(signalStrength)}%`, subValue: selectedSimSlot.toUpperCase(), color: isServerConnected ? 'var(--success-color)' : 'var(--text-secondary)' },
          { icon: Battery, label: t('relayBattery') || 'BATTERY', value: `${Math.round(batteryLevel)}%${isCharging ? ' ⚡' : ''}`, color: batteryLevel > 20 ? (isServerConnected ? 'var(--success-color)' : 'var(--text-secondary)') : 'var(--error-color)' },
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
        {noProfileWarning && (
          <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', lineHeight: '1.4', padding: '0.7rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: 'var(--error-color)', fontWeight: '700' }}>
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
              border: relayNotice.type === 'error'
                ? '1px solid rgba(239,68,68,0.35)'
                : (relayNotice.type === 'success'
                  ? '1px solid rgba(34,197,94,0.35)'
                  : '1px solid rgba(59,130,246,0.35)'),
              background: relayNotice.type === 'error'
                ? 'rgba(239,68,68,0.08)'
                : (relayNotice.type === 'success'
                  ? 'rgba(34,197,94,0.08)'
                  : 'rgba(59,130,246,0.08)'),
              color: relayNotice.type === 'error'
                ? 'var(--error-color)'
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.time}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {log.content}
                </p>
              </div>
              <div style={{
                fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '800',
                background: log.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : log.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: log.status === 'failed' ? 'var(--error-color)' : log.status === 'pending' ? '#f59e0b' : 'var(--success-color)'
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
          <div style={{ background: '#12141a', border: '1px solid var(--card-border)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
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
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeLog.time} • {(activeLog.transport || activeLog.type || 'sms').toUpperCase()} • {t('relayForwardedToNexus') || 'Forwarded to Nexus'}</div>
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
          }} onClick={e => e.stopPropagation()}>
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
                          onClick={(e) => { e.stopPropagation(); setSelectedSimSlot(slot); }}
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
                      onClick={e => { e.stopPropagation(); item.onToggle(); }}
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
                onClick={(e) => { e.stopPropagation(); setShowSettings(false); }}
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
