import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { NexusContext } from './ContextObject';
import { useNexus } from './ContextHook';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useNexusData } from '../hooks/useNexusData';
import { useSocket } from '../hooks/useSocket';
import { initPushNotifications, removePushListeners } from '../services/pushService';
import { TRANSLATIONS } from '../translations';
import { API_BASE } from '../constants/config';

// Shared AudioContext to prevent exhaustion on mobile devices
let sharedAudioCtx = null;
const getSharedAudioCtx = () => {
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      // AudioContext failure
    }
  }
  return sharedAudioCtx;
};


const getSafeStorage = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_err) {
    console.warn('[Nexus-Bootstrap] Storage access failed:', _err);
    return fallback;
  }
};

export const NexusProvider = ({ children }) => {
  // 1. Core UI States
  const [lang, setLang] = useState(() => {
    const stored = getSafeStorage('nexus_lang', null);
    if (stored) return stored;
    
    // Automatic detection for first-time users
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (browserLang.includes('cs') || browserLang.includes('sk')) return 'cz';
    }
    return 'en';
  });

  // Consolidated States (To prevent ReferenceError in production builds)
  const [heartRate, setHeartRate] = useState(0);
  const [hrThreshold, setHrThreshold] = useState(() => Number(localStorage.getItem('nexus_hrThreshold')) || 130);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvToken, setTvToken] = useState(null);
  const [activeBioWarning, setActiveBioWarning] = useState(null);
  const [linkedTrackerId, setLinkedTrackerId] = useState(() => localStorage.getItem('nexus_linkedTrackerId') || null);
  const [trackerStatus, setTrackerStatus] = useState('disconnected');
  const [audioSentinelActive, setAudioSentinelActive] = useState(() => localStorage.getItem('nexus_audio_sentinel') === 'true');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalPromise, setPinModalPromise] = useState(null);
  const [agencyDetailModalData, setAgencyDetailModalData] = useState(null);
  const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserModalAgencyId, setAddUserModalAgencyId] = useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState("");
  const [clientNotes, setClientNotes] = useState({});
  const [internalNote, setInternalNote] = useState("");
  const [detectedMeeting, setDetectedMeeting] = useState(null);
  const [typingProfiles, setTypingProfiles] = useState({});
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [linkedSessionId, setLinkedSessionId] = useState(null);
  const [checkinMinutes, setCheckinMinutes] = useState(60);
  const [checkinTimerEnd, setCheckinTimerEnd] = useState(null);
  const [checkinRemaining, setCheckinRemaining] = useState(null);
  const [voiceGuardianActive, setVoiceGuardianActive] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [incomingGhostCall, setIncomingGhostCall] = useState(false);
  const [ghostCallScheduledAt, setGhostCallScheduledAt] = useState(null);
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [_toasts, _setToasts] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [ _gpsHistory, setGpsHistory] = useState([]);
  const [lastTrackerUpdate, setLastTrackerUpdate] = useState(null);
  const [activeSafetySession, _setActiveSafetySession] = useState(null);
  const [sosAlertId, setSosAlertId] = useState(null);
  const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);

  const checkinIntervalRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);

  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([
    { id: 'basic', name: 'Basic', descriptionKey: 'basicDesc', prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 5, features: ['feat_profiles', 'feat_analytics_basic', 'feat_support'] },
    { id: 'pro', name: 'Pro', descriptionKey: 'proDesc', prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10, features: ['feat_all_basic', 'feat_analytics_adv', 'feat_ai_opt'] },
    { id: 'agency', name: 'Agency', descriptionKey: 'agencyDesc', prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 20, features: ['feat_all_pro', 'feat_audit_logs', 'feat_api_access'] }
  ]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [globalSettings, setGlobalSettings] = useState([]);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [incomingRelayCall, setIncomingRelayCall] = useState(null);
  
  // Translation helper - needed for useAuth
  // -------------------------------------------------------------------------
  // SECURE TRANSLATION ENGINE (Ultra-Hardened for Production)
  // -------------------------------------------------------------------------
  const t = useCallback((key, params = {}) => {
    try {
      if (!key || typeof key !== 'string') return key || '';
      
      // Multi-layer safety check for translations
      const safeTranslations = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS) || {};
      const langSet = safeTranslations[lang] || safeTranslations['en'] || {};
      let text = langSet[key] || key;

      // Safe parameter replacement
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          if (text.includes(`{{${k}}}`)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
          }
        });
      }
      return text;
    } catch (_err) {
      console.error('[NexusContext] Translation fallback triggered for:', key, _err);
      return String(key || '');
    }
  }, [lang]);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.substring(1);
      if (path && path !== '' && path !== 'dashboard') {
        return path;
      }
    }
    return localStorage.getItem('nexus_active_tab') || 'dashboard';
  });
  const [activeMarket, setActiveMarket] = useState(localStorage.getItem('nexus_active_market') || 'cz');
  const [activeProfileId, setActiveProfileId] = useState(localStorage.getItem('nexus_active_profile_id') || 'all');
  const [availableServers, setAvailableServers] = useState([
    { id: 'main-hub', name: 'Main Production Hub', ip: '78.141.202.139', region: 'Frankfurt', type: 'Primary' },
    { id: 'ai-node', name: 'AI Infrastructure Node', ip: '178.105.39.179', region: 'Nuremberg', type: 'AI' }
  ]);
  const [selectedServerId, setSelectedServerId] = useState('main-hub');
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      // If we are in a mobile app, we usually skip landing unless explicitly asked
      if (Capacitor.isNativePlatform()) {
        if (window.location.pathname === '/login') return false;
        return localStorage.getItem('nexus_isLoggedIn') !== 'true';
      }
      
      // On WEB, skip landing if already logged in
      if (localStorage.getItem('nexus_isLoggedIn') === 'true') return false;

      // If user already dismissed the landing page this session (e.g. they refreshed
      // while on the login screen), keep them on the login screen
      if (sessionStorage.getItem('nexus_landing_dismissed') === 'true') return false;
      
      // Otherwise show the landing page first
      return true;
    }
    return true;
  });
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_onboarding_seen') === 'true';
    }
    return false;
  });
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding && Capacitor.isNativePlatform());

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list'); 
  const [inlinePanelTab, setInlinePanelTab] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRelayActive, setIsRelayActive] = useState(() => localStorage.getItem('nexus_relay_active') === 'true');
  const [relaySimSlot, setRelaySimSlot] = useState(() => localStorage.getItem('nexus_relay_sim_slot') || 'auto');
  const [relayLogs, setRelayLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_relay_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addRelayLog = useCallback((type, from, content, direction, status = 'pending') => {
    const newLog = {
      id: 'relay_' + Date.now() + '_' + Math.random(),
      transport: type,
      type,
      from: from || 'UNKNOWN',
      content,
      direction: direction || 'outbound',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status
    };
    setRelayLogs(prev => {
      const updated = [newLog, ...prev.slice(0, 49)];
      localStorage.setItem('nexus_relay_logs', JSON.stringify(updated));
      return updated;
    });
    return newLog.id;
  }, []);

  const updateRelayLogStatus = useCallback((logId, newStatus) => {
    setRelayLogs(prev => {
      const updated = prev.map(l => l.id === logId ? { ...l, status: newStatus } : l);
      localStorage.setItem('nexus_relay_logs', JSON.stringify(updated));
      return updated;
    });
  }, []);



  // 3. IoT & Auth Persistence
  useEffect(() => {
    localStorage.setItem('nexus_hrThreshold', hrThreshold);
  }, [hrThreshold]);

  useEffect(() => {
    localStorage.setItem('nexus_audio_sentinel', String(audioSentinelActive));
  }, [audioSentinelActive]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('tvToken');
    if (token) {
      console.log('[Guardian-IoT] TV Token detected, activating Monitoring Mode');
      setTvToken(token);
      setIsTvMode(true);
      setActiveTab('tv-dashboard');
      setShowLanding(false);
      // In a real app, we would validate this token with the backend here
    }
  }, [setActiveTab, setShowLanding]);

  const playBeep = useCallback((freq = 880, duration = 0.1, gain = 0.05) => {
    try {
      const audioCtx = getSharedAudioCtx();
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration); 
    } catch (_err) {
      console.warn('[IoT-Audio] Beep failed:', _err);
    }
  }, []);

  const triggerSilentSOS = useCallback(async (type, payload = {}) => {
    console.log(`[Guardian-IoT] Triggering Silent SOS: ${type}`, payload);
    // In production, this would be an axios.post to /safety/silent-alarm
    // For now, we simulate the backend notification
    if (type === 'BIO_PANIC') {
      setActiveBioWarning({
        type: 'HEART_RATE',
        value: payload.value,
        timestamp: new Date().toISOString()
      });
    }
    // Logic for sending to manager via socket or API would go here
  }, []);

  useEffect(() => {
    if (heartRate > hrThreshold && !sosActive && !isTvMode) {
      const timer = setTimeout(() => {
        if (heartRate > hrThreshold) {
          triggerSilentSOS('BIO_PANIC', { value: heartRate });
        }
      }, 5000); // 5 second buffer to avoid spikes
      return () => clearTimeout(timer);
    }
  }, [heartRate, hrThreshold, sosActive, isTvMode, triggerSilentSOS]);

  useEffect(() => {
    if (!audioSentinelActive || sosActive) return;
    
    // Pulse beep every 10 seconds to confirm safety monitoring is alive
    const interval = setInterval(() => {
      playBeep(440, 0.05, 0.02); // Low frequency, short, very quiet beep
    }, 10000);

    return () => clearInterval(interval);
  }, [audioSentinelActive, sosActive, playBeep]);

  // -- Memoized Identity-Stable Callbacks for useAuth --
  const memoizedSetIsRelayMode = useCallback(() => {}, []);
  const memoizedSetSelectedChatId = useCallback(() => {}, []);
  const memoizedSetActiveProfileId = useCallback((id) => setActiveProfileId(id), []);
  const memoizedSetShowLanding = useCallback((val) => setShowLanding(val), []);

  // 4. Authentication Hook - Now with stabilized identities
  const auth = useAuth({ 
    API_BASE,
    t,
    setIsRelayMode: memoizedSetIsRelayMode, 
    setSelectedChatId: memoizedSetSelectedChatId, 
    setActiveProfileId: memoizedSetActiveProfileId, 
    setShowLanding: memoizedSetShowLanding 
  });
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn, scheduleTokenRefresh } = auth;


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;
    let listener;
    try {
      listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });
    } catch (_err) {
      console.warn('[App] Back button listener setup failed:', _err);
    }
    return () => { listener?.remove?.(); };
  }, [isNativeApp]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    _setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);


  const fetchGlobalSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalSettings(res.data);
    } catch (_err) {
      console.error('Fetch global settings _err:', _err);
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (_err) => {
        const originalRequest = _err.config;
        
        if (_err.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await scheduleTokenRefresh(0);
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshErr) {
            console.error('[Interceptor] Refresh failed', refreshErr);
            logout();
          }
        }
        return Promise.reject(_err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout, scheduleTokenRefresh]); 

  const memoizedSetActiveOperator = useCallback((op) => setActiveOperatorState(op), []);
  const memoizedSetMessages = useCallback((msgs) => setMessages(msgs), []);
  
  // ── Safety Methods ─────────────────────────────────────────────────────────
  
  const getGPSPosition = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      }
      return new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          (_err) => reject(_err),
          { timeout: 5000, enableHighAccuracy: true }
        )
      );
    } catch { return { lat: null, lng: null, accuracy: null }; }
  }, []);

  const triggerSOS = useCallback(async (type = 'manual') => {
    if (sosActive) return;
    try {
      const { lat, lng, accuracy } = await getGPSPosition();
      const res = await axios.post(`${API_BASE}/sos`, {
        type, lat, lng, accuracy,
        profileId: activeProfileId !== 'all' ? activeProfileId : null
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSosActive(true);
      setSosAlertId(res.data?.id);
      showToast(lang === 'cz' ? '🆘 SOS ACTIVATED' : '🆘 SOS AKTIVOVÁNO', 'error');
    } catch (_err) {
      console.warn('[SOS] Failed to trigger:', _err.message);
    }
  }, [sosActive, token, activeProfileId, getGPSPosition, showToast, lang]);

  const cancelSOS = useCallback(async () => {
    if (!sosAlertId) {
      setSosActive(false);
      return;
    }
    try {
      await axios.post(`${API_BASE}/sos/${sosAlertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? '✅ SOS zrušeno' : '✅ SOS resolved', 'success');
    } catch {
      // Ignore
    }
    setSosActive(false);
    setSosAlertId(null);
    setLinkedSessionId(null);
  }, [sosAlertId, token, showToast, lang]);

  const startCheckinTimer = useCallback((minutes) => {
    const mins = minutes || checkinMinutes;
    const endTime = Date.now() + mins * 60 * 1000;
    setCheckinTimerEnd(endTime);
    showToast(lang === 'cz' ? `⏰ Odpočet spuštěn: ${mins} min` : `⏰ Timer started: ${mins} min`, 'info');
  }, [checkinMinutes, showToast, lang]);

  const resetCheckinTimer = useCallback(async () => {
    setCheckinTimerEnd(null);
    setCheckinRemaining(null);
    if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);
    if (linkedSessionId) {
      try {
        await axios.post(`${API_BASE}/safety/sessions/${linkedSessionId}/ack`, { extendMinutes: 10 }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast(lang === 'cz' ? '✓ Stav potvrzen' : '✓ Status confirmed', 'success');
      } catch {
      // Ignore
    }
    }
  }, [linkedSessionId, token, showToast, lang]);

  const handleConfirmDeparture = useCallback(async () => {
    if (!linkedSessionId) return;
    try {
      await axios.post(`${API_BASE}/safety/sessions/${linkedSessionId}/departure`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Assuming fetchActiveSafetySession is available via nexusData or similar
      showToast(lang === 'cz' ? 'Klient odešel, odjezd potvrzen.' : 'Client left, departure confirmed.', 'success');
    } catch (_err) {
      console.error(_err);
    }
  }, [linkedSessionId, token, showToast, lang]);


  const handleToggleVoiceGuardian = useCallback(() => {
    if (voiceGuardianActive) {
      setVoiceGuardianActive(false);
      showToast(lang === 'cz' ? 'Hlasový dohled vypnut.' : 'Voice Guardian deactivated.', 'info');
    } else {
      setVoiceGuardianActive(true);
      showToast(lang === 'cz' ? 'Hlasový dohled aktivován.' : 'Voice Guardian activated.', 'success');
    }
  }, [voiceGuardianActive, lang, showToast]);

  const triggerGhostCall = useCallback((delaySec = 20) => {
    const scheduledAt = Date.now() + (delaySec * 1000);
    setGhostCallScheduledAt(scheduledAt);
    showToast(lang === 'cz' ? `Hovor naplánován za ${delaySec}s.` : `Call scheduled in ${delaySec}s.`, 'info');
    
    setTimeout(() => {
      setIncomingGhostCall(true);
      setGhostCallScheduledAt(null);
    }, delaySec * 1000);
  }, [lang, showToast]);

  const verifyIdentity = useCallback(async () => {
    return new Promise((resolve) => {
      setPinModalPromise({ resolve });
      setIsPinModalOpen(true);
    });
  }, []);

  // Effects for Safety
  useEffect(() => {
    if (!checkinTimerEnd) return;
    checkinIntervalRef.current = setInterval(() => {
      const remaining = checkinTimerEnd - Date.now();
      if (remaining <= 0) {
        clearInterval(checkinIntervalRef.current);
        setCheckinTimerEnd(null);
        setCheckinRemaining(null);
        triggerSOS('timer_expired');
      } else {
        setCheckinRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(checkinIntervalRef.current);
  }, [checkinTimerEnd, triggerSOS]);

  useEffect(() => {
    if (!sosActive || !sosAlertId) {
      if (gpsWatchRef.current) clearInterval(gpsWatchRef.current);
      return;
    }
    gpsWatchRef.current = setInterval(async () => {
      try {
        const { lat, lng, accuracy } = await getGPSPosition();
        if (!lat) return;
        
        const timestamp = new Date().toISOString();
        setLastTrackerUpdate(Date.now());
        setGpsHistory(prev => [...prev.slice(-19), { lat, lng, timestamp, accuracy }]);

        await axios.post(`${API_BASE}/sos/${sosAlertId}/location`, {
          lat, lng, accuracy, capturedAt: timestamp
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
      // Ignore
    }
    }, 15000);
    return () => clearInterval(gpsWatchRef.current);
  }, [sosActive, sosAlertId, token, getGPSPosition]);

  // Voice Guardian Lifecycle
  useEffect(() => {
    if (!voiceGuardianActive) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(lang === 'cz' ? 'Váš prohlížeč nepodporuje hlasové rozpoznávání.' : 'Your browser does not support voice recognition.', 'error');
      setVoiceGuardianActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === 'cz' ? 'cs-CZ' : 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('')
        .toUpperCase();

      const keywords = ['HELP', 'POMOC', 'SOS', 'STOP', 'NEMŮŽU', 'POMOZ', 'POLICIE'];
      if (keywords.some(k => transcript.includes(k))) {
        console.log('[VoiceGuardian] Emergency keyword detected! Triggering SOS.');
        triggerSOS('voice');
        setVoiceGuardianActive(false); // Disable after trigger
      }
    };

    recognition.onerror = (event) => {
      console.warn('[VoiceGuardian] Recognition _err:', event.error);
      if (event.error === 'not-allowed') {
        showToast(lang === 'cz' ? 'Přístup k mikrofonu byl zamítnut.' : 'Microphone access denied.', 'error');
        setVoiceGuardianActive(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active (to overcome browser timeout)
      // Added defensive delay to prevent ANR/Tight-loops on emulators
      if (voiceGuardianActive && !sosActive) {
        const restartTimer = setTimeout(() => {
          try { 
            if (voiceGuardianActive && !sosActive) recognition.start(); 
          } catch { /* silent retry */ }
        }, 2000);
        return () => clearTimeout(restartTimer);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (_err) { console.error('[VoiceGuardian] Start _err:', _err); }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [voiceGuardianActive, sosActive, lang, triggerSOS, showToast]);

  // Battery Sentinel
  useEffect(() => {
    if (!navigator.getBattery) return;
    
    let batteryInstance = null;
    const handleLevelChange = (_err) => {
      const b = _err.target || batteryInstance;
      if (b) setBatteryLevel(Math.floor(b.level * 100));
    };

    navigator.getBattery().then(battery => {
      batteryInstance = battery;
      setBatteryLevel(Math.floor(battery.level * 100));
      battery.addEventListener('levelchange', handleLevelChange);
    });

    return () => {
      if (batteryInstance) {
        batteryInstance.removeEventListener('levelchange', handleLevelChange);
      }
    };
  }, []); // Only once, battery level is monitored via event

  const memoizedSetActiveSafetySession = useCallback(() => {}, []);
  const memoizedSetIsTimerActive = useCallback(() => {}, []);
  const memoizedSetTimeLeft = useCallback(() => {}, []);
  const memoizedNormalizeProfileId = useCallback((id) => id, []);

  const nexusData = useNexusData({
    token,
    isLoggedIn,
    API_BASE,
    activeProfileId,
    setActiveOperator: memoizedSetActiveOperator,
    normalizeProfileId: memoizedNormalizeProfileId, 
    setMessages: memoizedSetMessages,
    setActiveSafetySession: memoizedSetActiveSafetySession,
    setIsTimerActive: memoizedSetIsTimerActive,
    setTimeLeft: memoizedSetTimeLeft,
    showToast,
    lang
  });

  const activeOperator = useMemo(() => {
    const base = authUser || {};
    const update = activeOperatorState || {};
    const combined = { ...base, ...update };
    const finalId = combined.id || combined._id || combined.userId;
    
    // CRITICAL: If we don't have a valid ID yet, we are still in a transient state.
    // Return null to keep App.jsx in Loading state until the profile is fully synced.
    if (!finalId) return null;
    
    const rawRole = (combined.role?.name || combined.role || '').toUpperCase();
    const name = combined.fullname || combined.name || combined.username || (combined.email ? combined.email.split('@')[0] : '');
    
    return {
      ...combined,
      id: finalId,
      name: name || 'User',
      role: rawRole,
      originalRole: combined.role?.name || combined.role || rawRole,
      avatar: combined.avatar || (name ? name.charAt(0) : 'U'),
      isAdmin: rawRole === 'AGENCY ADMIN' || rawRole === 'OWNER',
      isManager: rawRole === 'MANAGER' || rawRole === 'SENIOR MANAGER' || rawRole === 'SENIOR OPERATOR',
      isAppOwner: rawRole === 'APP OWNER' || rawRole === 'SUPER_ADMIN',
      isModel: rawRole === 'MODEL' || rawRole === 'MODELKA'
    };
  }, [activeOperatorState, authUser]);

  const { activeRole, isAllowed } = usePermissions(activeOperator, nexusData.rolePermissions);


  const onDelayBooking = useCallback(async (id, mins) => {
    const drafts = await nexusData.handleDelayBooking(id, mins);
    
    // If we are currently in a linked safety session, extend the timer too
    if (linkedSessionId === id && checkinTimerEnd) {
      setCheckinTimerEnd(prev => prev + (mins * 60 * 1000));
    }

    if (drafts && drafts.length > 0) {
      setPendingNotifications(prev => {
        // Avoid duplicate drafts for the same booking
        const existingIds = new Set(prev.map(p => p.bookingId));
        const uniqueDrafts = drafts.filter(d => !existingIds.has(d.bookingId));
        return [...prev, ...uniqueDrafts];
      });
    }
  }, [nexusData, linkedSessionId, checkinTimerEnd]);

  const handleNewMessage = useCallback((data) => {
    if (data?.message) {
      setMessages(prev => [...prev.slice(-199), data.message]);
    }
  }, []);
  const handleMessageUpdated = useCallback((data) => {
    if (data?.message) {
      setMessages(prev => prev.map(m => m.id === data.message.id ? { ...m, ...data.message } : m));
    }
  }, []);
  const handleIncomingCall = useCallback((data) => setIncomingRelayCall(data), []);
  const handleEmergencyAlert = useCallback((_data) => {
    showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
  }, [showToast, lang]);
  const handleRelayCommand = useCallback(async (data) => {
    if (!data) return;
    
    console.log('[Nexus-Relay-DEBUG] Incoming command data:', data);
    
    // Support multiple command structures for backward compatibility
    const isCommand = data.type === 'send_sms' || data.targetType === 'relay_command' || !!data.messageId;
    
    console.log('[Nexus-Relay-DEBUG] isCommand:', isCommand, 'isRelayActive:', isRelayActive);
    
    if (!isCommand) return;

    // Visual feedback that command was RECEIVED
    showToast(lang === 'cz' ? '📥 Přijat příkaz k odeslání SMS' : '📥 SMS relay command received', 'info');

    if (!isRelayActive) {
      console.log('[Nexus-Relay] Command received but relay is INACTIVE. Skipping.');
      showToast(lang === 'cz' ? '⚠️ Relay je neaktivní' : '⚠️ Relay is inactive', 'warning');
      return;
    }

    const messageId = data.messageId || data.id;
    const to = data.to || data.phoneNumber || data.phone;
    const text = data.content || data.text || data.body;

    if (!to || !text) {
      console.warn('[Nexus-Relay] Incomplete command data:', data);
      return;
    }

    const logId = addRelayLog('sms', to, text, 'outbound', 'pending');

    console.log('[Nexus-Relay] Remote send request received:', { to, messageId, textLength: text.length });
    
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (plugin) {
        // Physical send
        console.log('[Nexus-Relay] Calling plugin.sendSms...', { to, text });
        const result = await plugin.sendSms({ 
          to, 
          text,
          simSlot: relaySimSlot === 'auto' ? null : parseInt(relaySimSlot)
        });
        console.log('[Nexus-Relay] plugin.sendSms result:', result);
        
        updateRelayLogStatus(logId, 'sent');
        showToast(lang === 'cz' ? `SMS pro ${to} odeslána.` : `SMS for ${to} sent.`, 'success');

        // Notify server that it was sent (MUST BE PATCH)
        if (messageId) {
          await axios.patch(`${API_BASE}/messages/${messageId}/status`, 
            { status: 'sent', result: JSON.stringify(result) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          updateRelayLogStatus(logId, 'forwarded');
        }
      } else {
        console.warn('[Nexus-Relay] Relay command received but native plugin not available');
        showToast(lang === 'cz' ? 'Chyba: Relay plugin nedostupný' : 'Error: Relay plugin unavailable', 'error');
      }
    } catch (_err) {
      console.error('[Nexus-Relay] Failed to execute remote send command:', _err);
      updateRelayLogStatus(logId, 'failed');
      showToast(lang === 'cz' ? `SMS selhala: ${_err.message || 'Neznámá chyba'}` : `SMS failed: ${_err.message || 'Unknown _err'}`, 'error');
      
      if (messageId) {
        axios.patch(`${API_BASE}/messages/${messageId}/status`, 
          { status: 'failed', _err: _err.message },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      }
    }
  }, [token, isRelayActive, relaySimSlot, lang, showToast, addRelayLog, updateRelayLogStatus]);
  
  const handleRelayEvent = useCallback((data) => {
    if (data?.type === 'SYNC_COMPLETED') {
      showToast(lang === 'cz' ? '✅ Synchronizace přes Local Agent dokončena' : '✅ Sync via Local Agent completed', 'success');
      // Tady bychom mohli v budoucnu spustit refresh dat nebo aktualizovat specifický status profilu
    }
  }, [lang, showToast]);

  const handleSipIncomingCall = useCallback((_data) => {}, []);

  const syncRelayToNative = useCallback(async (active) => {
    if (!Capacitor.isNativePlatform() || !window.Capacitor?.Plugins?.NexusRelay) return;
    
    const installationId = localStorage.getItem('nexus_installation_id');
    const profileId = activeOperator?.profileId || activeOperator?.activeProfileId || localStorage.getItem('nexus_last_profile_id');
    
    try {
      const RELAY_API_BASE = API_BASE.replace(/\/api$/, '');
      const baseUrl = `${RELAY_API_BASE}/api/device/relay`;
      
      await window.Capacitor.Plugins.NexusRelay.configureRelay({
        baseUrl: baseUrl,
        deviceId: activeOperator?.id || 'RELAY-01',
        installationId: installationId || null,
        profileId: profileId || null,
        isActive: active,
        simSlot: relaySimSlot === 'auto' ? null : parseInt(relaySimSlot)
      });
      
      console.log(`[Nexus-Relay] Native sync: active=${active}, profileId=${profileId}`);
    } catch (_err) {
      console.warn('[Nexus-Relay] Native sync failed:', _err);
    }
  }, [activeOperator, relaySimSlot]);

  // Persistent Relay Lifecycle
  useEffect(() => {
    if (isLoggedIn && activeOperator?.isModel && !isRelayActive && localStorage.getItem('nexus_relay_ever_enabled') !== 'true') {
      // Auto-enable for models who haven't explicitly disabled it
      setIsRelayActive(true);
      localStorage.setItem('nexus_relay_active', 'true');
      localStorage.setItem('nexus_relay_ever_enabled', 'true');
    }
  }, [isLoggedIn, activeOperator, isRelayActive]);

  useEffect(() => {
    if (isLoggedIn) {
      syncRelayToNative(isRelayActive);
    }
  }, [isLoggedIn, isRelayActive, activeOperator?.id, relaySimSlot, syncRelayToNative]);

  useSocket(token, handleNewMessage, handleMessageUpdated, handleIncomingCall, handleEmergencyAlert, handleSipIncomingCall, handleRelayCommand, handleRelayEvent);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    initPushNotifications(API_BASE, token, async (notification, tapped) => {
      const data = notification?.data;
      
      // 1. Navigation handling
      if (tapped && data?.chatId) {
        setSelectedChatId(data.chatId);
        setActiveTab('inbox');
      }
      
      // 2. Safety handling
      if (data?.type === 'safety_alert') {
        showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
      }

      // 3. Relay handling
      if (data) {
        handleRelayCommand(data);
      }
    });
    return () => { removePushListeners(); };
  }, [isLoggedIn, token, showToast, lang, handleRelayCommand]);

  const onLogin = useCallback(async (email, password) => {
    const result = await auth.handleLogin(email, password);
    if (result?.success) {
      setShowLanding(false);
      setActiveTab('dashboard');
      return true;
    }
    const errorMessages = {
      connectionError: lang === 'cz' ? 'Chyba připojení. Zkontrolujte internet.' : 'Connection _err. Please check your internet.',
      loginError: lang === 'cz' ? 'Neplatné přihlašovací údaje.' : 'Invalid credentials.',
    };
    const msg = result?.detail || errorMessages[result?.error] || result?.error || (lang === 'cz' ? 'Přihlášení se nezdařilo.' : 'Login failed.');
    showToast(msg, 'error');
    return { success: false, message: msg };
  }, [auth, showToast, lang]);

  const profiles = useMemo(() => nexusData.profiles || [], [nexusData.profiles]);
  
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    
    // Normalize operator ID and role for reliable comparison
    const opId = String(activeOperator.id || activeOperator._id || activeOperator.userId || '').toLowerCase();
    const rawRoleStr = String(activeRole || '').toLowerCase();
    
    // Roles that should see ALL agency profiles by default
    const isAgencyLevel = ['agency admin', 'manager', 'senior operator', 'senior manager', 'owner'].includes(rawRoleStr);
    
    // Calculate base profiles before final filtering
    let filtered = [];
    
    if (activeOperator.isAppOwner || isAgencyLevel) {
      filtered = [...(profiles || [])];
    } else if (activeOperator.isModel) {
      // SECURITY: Models NEVER have "assigned" profiles. 
      // They ONLY see the profile they strictly own (match by userId)
      filtered = (profiles || []).filter(p => {
        if (!p) return false;
        
        // Cross-reference: Direct ownership, assigned operator, or linked profileId
        const ownerMatch = (p.userId && String(p.userId) === opId) || 
                           (p.ownerId && String(p.ownerId) === opId) ||
                           (p.owner_id && String(p.owner_id) === opId);
                           
        const isOperatorMatch = Array.isArray(p.operators) && p.operators.some(o => {
          const targetId = String(o?.id || o?._id || o?.userId || o || '').toLowerCase();
          return targetId === opId;
        });
        
        const isAssigneeMatch = Array.isArray(p.assignees) && p.assignees.some(a => {
          const targetId = String(a?.id || a?._id || a?.userId || a || '').toLowerCase();
          return targetId === opId;
        });

        const isProfileIdMatch = (activeOperator.profileId && (String(p.id || p._id) === String(activeOperator.profileId))) ||
                                 (activeOperator.activeProfileId && (String(p.id || p._id) === String(activeOperator.activeProfileId)));

        return ownerMatch || isOperatorMatch || isAssigneeMatch || isProfileIdMatch;
      });
    } else {
      // For regular operators, filter by explicit assignment (assignees/operators)
      filtered = (profiles || []).filter(p => {
        if (!p) return false;
        const asgs = Array.isArray(p.assignees) ? p.assignees : [];
        const ops = Array.isArray(p.operators) ? p.operators : [];
        const isAssigneeMatch = asgs.some(a => String(a?.id || a?._id || a?.userId || a).toLowerCase() === opId);
        const isOperatorMatch = ops.some(o => String(o?.id || o?._id || o?.userId || o).toLowerCase() === opId);
        const isOwnerMatch = String(p.userId || p.ownerId || p.owner_id || '').toLowerCase() === opId;
        return isAssigneeMatch || isOperatorMatch || isOwnerMatch;
      });
    }

    // Final layer: Online filtering (Strictly matches the UI green dots)
    if (onlineOnly) {
      return (filtered || []).filter(p => p && p.status === 'online');
    }
    
    return filtered;
  }, [profiles, activeOperator, activeRole, onlineOnly]);

  // SECURITY ENFORCEMENT: For Models, ensure activeProfileId is NEVER 'all' if they have profiles.
  // This prevents accidental exposure of "Agency-wide" data views.
  useEffect(() => {
    if (activeOperator?.isModel && activeProfileId === 'all' && myProfiles.length > 0) {
      console.log('[NexusContext] Enforcing specific profile filter for model user');
      setActiveProfileId(String(myProfiles[0].id));
    }
  }, [activeOperator, activeProfileId, myProfiles, setActiveProfileId]);


  const fetchPlans = useCallback(async () => {
    try {
      setIsPlansLoading(true);
      const res = await axios.get(`${API_BASE}/subscriptions/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionPlans(res.data);
    } catch (_err) {
      console.error('Fetch plans _err:', _err);
    } finally {
      setIsPlansLoading(false);
    }
  }, [token]);

  const updatePlans = useCallback(async (newPlans) => {
    try {
      setIsPlansLoading(true);
      await axios.post(`${API_BASE}/subscriptions/config`, { plans: newPlans }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionPlans(newPlans);
      return { success: true };
    } catch (_err) {
      console.error('Update plans _err:', _err);
      return { success: false, _err: _err.message };
    } finally {
      setIsPlansLoading(false);
    }
  }, [token]);

  const activeProfile = useMemo(() => 
    (profiles || []).find(p => p.id === activeProfileId) || (myProfiles || [])[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const filteredMessages = useMemo(() => {
    const rawMessages = messages || [];
    
    // SECURITY: If user is a model, strictly filter by their assigned profiles (myProfiles)
    let baseMessages = rawMessages;
    
    if (activeOperator?.isModel) {
      const myProfileIds = new Set((myProfiles || []).map(p => String(p.id || p._id)));
      baseMessages = rawMessages.filter(m => {
        const msgProfileId = String(m.profileId || m.profile_id || '');
        return myProfileIds.has(msgProfileId);
      });
      
      // DIAGNOSTIC (Internal): If we have messages in system but filter result is 0, 
      // check if activeOperator.profileId exists as a fallback.
      if (baseMessages.length === 0 && rawMessages.length > 0 && activeOperator?.profileId) {
        baseMessages = rawMessages.filter(m => String(m.profileId || m.profile_id) === String(activeOperator.profileId));
      }
    }

    if (activeProfileId === 'all') return baseMessages;
    
    // Further filter by selected profile
    const currentProfileId = String(activeProfile?.id || activeProfile?._id || '');
    return baseMessages.filter(m => String(m.profileId || m.profile_id || '') === currentProfileId);
  }, [messages, activeProfile, activeProfileId, activeOperator, myProfiles]);

  const selectedChat = useMemo(() => (messages || []).find(m => m.id === selectedChatId) || null, [messages, selectedChatId]);

  const chatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    // Only return chatHistory if it actually belongs to the selected chat
    const filteredHistory = (chatHistory || []).filter(m => String(m.chatId) === String(selectedChatId));
    if (filteredHistory.length > 0) return filteredHistory;
    
    // Fallback to the latest message from the global messages list while history is loading
    return (messages || []).filter(m => String(m.chatId) === String(selectedChatId));
  }, [messages, selectedChatId, chatHistory]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!token || !chatId) return;
    try {
      setIsHistoryLoading(true);
      // Optional: Clear history before fetching to avoid showing stale data
      // setChatHistory([]); 
      const res = await axios.get(`${API_BASE}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = (res.data || []).map(m => {
        const rawDate = m.createdAt || m.timestamp || m.time || new Date();
        const msgDate = new Date(rawDate);
        const validDate = isNaN(msgDate.getTime()) ? new Date() : msgDate;
        
        return {
          ...m,
          time: validDate.toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
          senderName: m.sender?.name || null
        };
      });
      setChatHistory(history);
    } catch (_err) { console.error('Failed to fetch chat messages:', _err); } finally { setIsHistoryLoading(false); }
  }, [token, lang]);

  // ── Automatic History Fetching ──────────────────────────────────────────
  useEffect(() => {
    if (selectedChatId) {
      setChatHistory([]); // Clear immediately to show loader/fresh state
      fetchChatMessages(selectedChatId);
    } else {
      setChatHistory([]);
    }
  }, [selectedChatId, fetchChatMessages]);

  const totalUnread = useMemo(() => {
    const myProfileIds = new Set((myProfiles || []).map(p => p.id));
    return (messages || []).filter(m => m.status === 'unread' && myProfileIds.has(m.profileId)).length;
  }, [messages, myProfiles]);

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim() || !selectedChatId || !token) return;
    
    const tempId = Date.now();
    const currentText = text.trim();
    
    // Optimistic UI update
    const optimisticMsg = { 
      id: tempId, 
      chatId: selectedChatId, 
      from: 'Nexus Hub', 
      direction: 'OUTBOUND', 
      text: currentText, 
      createdAt: new Date().toISOString(), 
      status: 'sending',
      time: new Date().toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
      senderName: activeOperator?.name || 'Me'
    };

    setMessages(prev => {
      // Update the preview in the inbox list
      return prev.map(m => m.chatId === selectedChatId ? { ...m, text: currentText, timestamp: optimisticMsg.createdAt, status: 'sent' } : m);
    });

    setChatHistory(prev => [...prev, optimisticMsg]);
    setMessageValue("");

    try {
      const res = await axios.post(`${API_BASE}/messages`, {
        chatId: selectedChatId,
        text: currentText,
        direction: 'OUTBOUND'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        showToast(lang === 'cz' ? 'Zpráva uložena na server, čekám na relay...' : 'Message saved to server, awaiting relay...', 'info');
        console.log('[Nexus-Messaging] Message created on server, ID:', res.data.id);
        
        // Replace temp message with real one from server
        const realMsg = {
          ...res.data,
          time: new Date(res.data.createdAt).toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
          senderName: res.data.sender?.name || activeOperator?.name || 'Me'
        };
        
        setChatHistory(prev => prev.map(m => m.id === tempId ? realMsg : m));
      }
    } catch (_err) {
      console.error('[Nexus-Messaging] Failed to send message:', _err);
      showToast(lang === 'cz' ? 'Zprávu se nepodařilo odeslat na server.' : 'Failed to send message to server.', 'error');
      // Mark as failed in UI
      setChatHistory(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  }, [selectedChatId, token, lang, activeOperator, showToast]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => { setTranslatedText(`[Translated to EN]: ${sourceText}`); setIsTranslating(false); }, 1000);
  }, [sourceText]);

  const handleSaveNote = useCallback(() => {
    if (!internalNote.trim() || !selectedChatId || !selectedChat) return;
    const from = selectedChat.from;
    const newNote = { id: Date.now(), text: internalNote, author: activeOperator.name, timestamp: new Date().toLocaleTimeString() };
    setClientNotes(prev => ({ ...prev, [from]: [...(prev[from] || []), newNote] }));
    setInternalNote("");
  }, [internalNote, selectedChatId, selectedChat, activeOperator]);

  const handleDeleteNote = useCallback((client, noteId) => {
    setClientNotes(prev => ({ ...prev, [client]: (prev[client] || []).filter(n => n.id !== noteId) }));
  }, []);

  const startCall = useCallback(() => showToast(lang === 'cz' ? 'Inicializace VoIP spojení...' : 'Initializing secure VoIP relay...', 'info'), [showToast, lang]);

  const handleQuickSaveMeeting = useCallback(() => {
    if (!detectedMeeting) return;
    nexusData.handleQuickSaveMeeting(detectedMeeting);
    setDetectedMeeting(null);
  }, [detectedMeeting, nexusData]);

  // ── Android Back Button Handling ──────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener = null;

    const setupBack = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        // 1. Sidebar
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return;
        }
        
        // 2. Modals
        if (nexusData.isBookingModalOpen) { nexusData.setIsBookingModalOpen(false); return; }
        if (isBugReportOpen) { setIsBugReportOpen(false); return; }
        if (isAddAgencyOpen) { setIsAddAgencyOpen(false); return; }
        if (isAddUserOpen) { setIsAddUserOpen(false); return; }
        if (agencyDetailModalData) { setAgencyDetailModalData(null); return; }

        // 3. Chat / Mobile View
        if (selectedChatId || mobileView === 'chat') {
          setSelectedChatId(null);
          setMobileView('list');
          return;
        }

        // 4. Navigation logic
        if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
          return;
        }

        // 5. Exit logic
        CapacitorApp.exitApp();
      });
    };

    setupBack();

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [isSidebarOpen, selectedChatId, activeTab, mobileView,
    isBugReportOpen, isAddAgencyOpen, isAddUserOpen, agencyDetailModalData,
    nexusData, setSelectedChatId, setMobileView, setActiveTab
  ]);

  const value = useMemo(() => ({
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    loading: nexusData.isDataLoading, activeOperator, activeRole, isAllowed,
    isLoggedIn, token, logout: () => { logout(); setShowLanding(true); }, 
    onLogin, onRegisterAgency: auth.handleRegisterAgency, onRegisterUser: auth.handleRegisterUser,
    isAppOwner: activeOperator?.isAppOwner || false,
    isManager: activeOperator?.isManager || false,
    isAdmin: activeOperator?.isAdmin || false,
    API_BASE, showLanding: showLanding ?? !isLoggedIn, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    updatePlans, fetchPlans, subscriptionPlans, isPlansLoading, showToast, contextToasts: _toasts,
    isMobile, isNativeApp, isSidebarCollapsed, setIsSidebarCollapsed, mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab, sourceText, setSourceText, translatedText, setTranslatedText, isTranslating, setIsTranslating,
    internalNote, setInternalNote, clientNotes, detectedMeeting, setDetectedMeeting, typingProfiles, setTypingProfiles,
    showPanicConfirm, setShowPanicConfirm, chatScrollRef, isUserScrolled, incomingRelayCall, setIncomingRelayCall,
    activeSafetySession, sosActive, linkedSessionId, checkinMinutes, setCheckinMinutes,
    checkinTimerEnd, checkinRemaining, triggerSOS, cancelSOS, 
    startCheckinTimer, resetCheckinTimer, confirmDeparture: handleConfirmDeparture,
    pendingNotifications, setPendingNotifications, onDelayBooking,
    agencyDetailModalData, setAgencyDetailModalData, isAddAgencyOpen, setIsAddAgencyOpen,
    isBugReportOpen, setIsBugReportOpen, isAddUserOpen, setIsAddUserOpen, addUserModalAgencyId, setAddUserModalAgencyId,
    SAFETY_SUGGESTIONS: ['15m', '30m', '45m', '60m', '1.5h', '2h'],
    handleAddAgency: () => setIsAddAgencyOpen(true),
    handleAgencyDetail: (agency) => setAgencyDetailModalData(agency),
    handleEditProfile: (profile) => { setEditingProfileData(profile); setIsEditProfileOpen(true); },
    isEditProfileOpen, setIsEditProfileOpen, editingProfileData, setEditingProfileData,
    handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote, startCall, handleQuickSaveMeeting,
    activeProfile, activeProfileId, setActiveProfileId, profiles, myProfiles, assignedProfiles: myProfiles,
    onlineOnly, setOnlineOnly, 
    agencies: nexusData.agencies, stats: nexusData.stats,
    operators: nexusData.operators, setProfiles: nexusData.setProfiles,
    toggleOperatorStatus: nexusData.toggleOperatorStatus, handleSaveAssignees: nexusData.handleSaveAssignees,
    isSyncing: nexusData.isSyncing, syncStatus: nexusData.syncStatus, syncProgress: nexusData.syncProgress,
    relayOnline: nexusData.relayOnline, handleSyncAll: nexusData.handleSyncAll, 
    handleSaveBio: nexusData.handleSaveBio, handleSaveCredentials: nexusData.handleSaveCredentials,
    bioText: nexusData.bioText, setBioText: nexusData.setBioText,
    isSidebarOpen, setIsSidebarOpen,
    totalUnread, messages, filteredMessages, selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, setIsHistoryLoading,
    isRelayActive, setIsRelayActive: (val) => {
      setIsRelayActive(val);
      localStorage.setItem('nexus_relay_active', String(val));
    }, 
    relaySimSlot, setRelaySimSlot, relayLogs, setRelayLogs, addRelayLog, updateRelayLogStatus,
    linkedTrackerId, setLinkedTrackerId, trackerStatus, setTrackerStatus,
    messageValue, setMessageValue, calViewDate, setCalViewDate, globalSettings, fetchGlobalSettings,
     _gpsHistory, lastTrackerUpdate,
    voiceGuardianActive, handleToggleVoiceGuardian,
    batteryLevel, incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    heartRate, setHeartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected,
    isTvMode, tvToken, activeBioWarning, setActiveBioWarning, playBeep, triggerSilentSOS,
    audioSentinelActive, setAudioSentinelActive,
    isPinModalOpen, setIsPinModalOpen, pinModalPromise, setPinModalPromise,
    handleUpdateGlobalSetting: async (key, value) => {
      try {
        const res = await axios.patch(`${API_BASE}/admin/settings/${key}`, { value }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGlobalSettings(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.key === key);
          if (idx > -1) updated[idx].value = value;
          else updated.push({ key, value });
          return updated;
        });
        showToast(lang === 'cz' ? 'Nastavení uloženo ✓' : 'Setting saved ✓', 'success');
        return { success: true, data: res.data };
      } catch { return { success: false }; }
    },
    handleRelayCommand,
    selectedServerId, setSelectedServerId, availableServers
  }), [
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    nexusData, activeOperator, activeRole, isAllowed,
    isLoggedIn, token, logout, onLogin, auth,
    showLanding, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    updatePlans, fetchPlans, subscriptionPlans, isPlansLoading, showToast, _toasts,
    isMobile, isNativeApp, isSidebarCollapsed, setIsSidebarCollapsed, mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab, sourceText, setSourceText, translatedText, setTranslatedText, isTranslating, setIsTranslating,
    internalNote, setInternalNote, clientNotes, detectedMeeting, setDetectedMeeting, typingProfiles, setTypingProfiles,
    showPanicConfirm, setShowPanicConfirm, chatScrollRef, isUserScrolled, incomingRelayCall, setIncomingRelayCall,
    activeSafetySession, sosActive, linkedSessionId, checkinMinutes, setCheckinMinutes,
    checkinTimerEnd, checkinRemaining, triggerSOS, cancelSOS, 
    startCheckinTimer, resetCheckinTimer, handleConfirmDeparture,
    pendingNotifications, setPendingNotifications, onDelayBooking,
    agencyDetailModalData, setAgencyDetailModalData, isAddAgencyOpen, setIsAddAgencyOpen,
    isBugReportOpen, setIsBugReportOpen, isAddUserOpen, setIsAddUserOpen, addUserModalAgencyId, setAddUserModalAgencyId,
    isEditProfileOpen, setIsEditProfileOpen, editingProfileData, setEditingProfileData,
    handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote, startCall, handleQuickSaveMeeting,
    activeProfile, activeProfileId, setActiveProfileId, profiles, myProfiles, onlineOnly, setOnlineOnly, 
    nexusData.agencies, nexusData.stats,
    nexusData.operators, nexusData.setProfiles, nexusData.toggleOperatorStatus, nexusData.handleSaveAssignees,
    nexusData.isSyncing, nexusData.syncStatus, nexusData.syncProgress, nexusData.relayOnline,
    nexusData.handleSyncAll, nexusData.handleSaveBio, nexusData.handleSaveCredentials,
    nexusData.bioText, nexusData.setBioText,
    isSidebarOpen, setIsSidebarOpen, totalUnread, messages, filteredMessages, selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, setIsHistoryLoading,
    isRelayActive, setIsRelayActive, relaySimSlot, setRelaySimSlot, relayLogs, setRelayLogs, addRelayLog, updateRelayLogStatus,
    linkedTrackerId, setLinkedTrackerId, trackerStatus, setTrackerStatus,
    messageValue, setMessageValue, calViewDate, setCalViewDate, globalSettings, fetchGlobalSettings,
     _gpsHistory, lastTrackerUpdate, voiceGuardianActive, handleToggleVoiceGuardian,
    batteryLevel, incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    heartRate, setHeartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected,
    isTvMode, tvToken, activeBioWarning, setActiveBioWarning, playBeep, triggerSilentSOS,
    audioSentinelActive, setAudioSentinelActive, isPinModalOpen, setIsPinModalOpen, pinModalPromise, setPinModalPromise,
    handleRelayCommand,
    selectedServerId, setSelectedServerId, availableServers
  ]);
  useEffect(() => {
    if (isLoggedIn && (authUser?.isAppOwner || authUser?.isManager)) {
      fetchGlobalSettings();
    }
  }, [isLoggedIn, authUser, fetchGlobalSettings]);

  useEffect(() => {
    localStorage.setItem('nexus_lang', lang);
    localStorage.setItem('nexus_active_tab', activeTab);
    localStorage.setItem('nexus_active_market', activeMarket);
    if (activeProfileId) localStorage.setItem('nexus_active_profile_id', activeProfileId);
    
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!isLoggedIn) {
        if (!showLanding) {
          if (currentPath !== '/login') window.history.replaceState(null, '', '/login');
        } else {
          if (currentPath !== '/') window.history.replaceState(null, '', '/');
        }
      } else {
        const targetPath = `/${activeTab}`;
        if (activeTab && currentPath !== targetPath) {
          window.history.replaceState(null, '', targetPath);
        }
      }
    }
  }, [lang, activeTab, activeMarket, activeProfileId, isLoggedIn, showLanding]);

  return (
    <NexusContext.Provider value={value}>
      {children}
      {_toasts.length > 0 && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
          {_toasts.map(toast => (
            <div key={toast.id} style={{ pointerEvents: 'auto', padding: '0.75rem 1.25rem', borderRadius: '12px', color: 'white', background: toast.type === '_err' ? '#ef4444' : '#3b82f6' }}>{toast.message}</div>
          ))}
        </div>
      )}
    </NexusContext.Provider>
  );
};
