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
import { normalizeRole } from '../utils/roleUtils';

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
  // --- 1. CORE UI & LANGUAGE STATES ---
  const [lang, setLang] = useState(() => {
    const stored = getSafeStorage('nexus_lang', null);
    if (stored) return stored;
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (browserLang.includes('cs') || browserLang.includes('sk')) return 'cz';
    }
    return 'en';
  });

  // --- 2. ALL STATE HOOKS (Top-level for TDZ safety) ---
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
  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [incomingRelayCall, setIncomingRelayCall] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.substring(1);
      if (path && path !== '' && path !== 'dashboard') return path;
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list'); 
  const [inlinePanelTab, setInlinePanelTab] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeContextTab, setActiveContextTab] = useState('translator');
  const [translateTargetLang, setTranslateTargetLang] = useState('AUTO');
  const [isRelayActive, setIsRelayActive] = useState(() => localStorage.getItem('nexus_relay_active') === 'true');
  const [relaySimSlot, setRelaySimSlot] = useState(() => localStorage.getItem('nexus_relay_sim_slot') || 'auto');
  const [relayLogs, setRelayLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_relay_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [subscriptionPlans, setSubscriptionPlans] = useState([
    { id: 'basic', name: 'Basic', descriptionKey: 'basicDesc', prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 5, features: ['feat_profiles', 'feat_analytics_basic', 'feat_support'] },
    { id: 'pro', name: 'Pro', descriptionKey: 'proDesc', prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10, features: ['feat_all_basic', 'feat_analytics_adv', 'feat_ai_opt'] },
    { id: 'agency', name: 'Agency', descriptionKey: 'agencyDesc', prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 20, features: ['feat_all_pro', 'feat_audit_logs', 'feat_api_access'] }
  ]);

  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      if (Capacitor.isNativePlatform()) {
        if (window.location.pathname === '/login') return false;
        return localStorage.getItem('nexus_isLoggedIn') !== 'true';
      }
      if (localStorage.getItem('nexus_isLoggedIn') === 'true') return false;
      if (sessionStorage.getItem('nexus_landing_dismissed') === 'true') return false;
      return true;
    }
    return true;
  });
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('nexus_onboarding_seen') === 'true';
    return false;
  });
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding && Capacitor.isNativePlatform());

  // --- 3. ALL REF HOOKS ---
  const checkinIntervalRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);
  const lastRelayConfigRef = useRef(null);

  // --- 4. ALL MEMO HOOKS ---
  const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);

  // --- 5. CORE FUNCTIONS (Stable Identities) ---
  const t = useCallback((key, params = {}) => {
    try {
      if (!key || typeof key !== 'string') return key || '';
      const safeTranslations = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS) || {};
      const langSet = safeTranslations[lang] || safeTranslations['en'] || {};
      let text = langSet[key] || key;
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

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    _setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const checkRelayStatus = useCallback(async () => {
    if (Capacitor.isNativePlatform() && window.Capacitor?.Plugins?.NexusRelay) {
      try {
        const status = await window.Capacitor.Plugins.NexusRelay.checkStatus();
        if (status) return { connected: !!window._nexusSocket?.connected, bridgeActive: !!status.isActive };
      } catch { /* ignore */ }
    }
    return { connected: !!window._nexusSocket?.connected, bridgeActive: isRelayActive };
  }, [isRelayActive]);

  const checkProfileHealth = useCallback(async (profileId) => {
    return { isHealthy: !!window._nexusSocket?.connected, profileId, lastSeen: new Date().toISOString() };
  }, []);

  const addRelayLog = useCallback((type, from, content, direction, status = 'pending') => {
    const newLog = {
      id: 'relay_' + Date.now() + '_' + Math.random(),
      transport: type, type, from: from || 'UNKNOWN', content,
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

  const playBeep = useCallback((freq = 880, duration = 0.1, gain = 0.05) => {
    try {
      const audioCtx = getSharedAudioCtx();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
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
    if (type === 'BIO_PANIC') {
      setActiveBioWarning({
        type: 'HEART_RATE',
        value: payload.value,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  const setRelayActiveStable = useCallback((val) => {
    setIsRelayActive(val);
    localStorage.setItem('nexus_relay_active', String(val));
  }, []);

  // --- 6. AUTHENTICATION & DATA HOOKS ---
  const auth = useAuth({ 
    API_BASE,
    _t: t,
    setIsRelayMode: setRelayActiveStable, 
    setSelectedChatId, 
    setActiveProfileId, 
    setShowLanding 
  });
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn, scheduleTokenRefresh, handleLogin } = auth;

  // --- 7. STABILIZED SETTERS (For useNexusData) ---
  const memoizedSetActiveOperator = useCallback((op) => setActiveOperatorState(op), []);
  const memoizedSetMessages = useCallback((msgs) => setMessages(msgs), []);
  const memoizedSetActiveSafetySession = useCallback((sess) => _setActiveSafetySession(sess), []);
  const memoizedSetIsTimerActive = useCallback(() => {}, []); 
  const memoizedSetTimeLeft = useCallback((time) => setCheckinRemaining(time), []);
  const memoizedNormalizeProfileId = useCallback((id) => id, []);

  // --- 8. SAFETY METHODS ---
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
  }, [sosActive, token, activeProfileId, getGPSPosition, showToast, lang, API_BASE]);

  const cancelSOS = useCallback(async () => {
    if (!sosAlertId) { setSosActive(false); return; }
    try {
      await axios.post(`${API_BASE}/sos/${sosAlertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? '✅ SOS zrušeno' : '✅ SOS resolved', 'success');
    } catch { /* ignore */ }
    setSosActive(false);
    setSosAlertId(null);
    setLinkedSessionId(null);
  }, [sosAlertId, token, showToast, lang, API_BASE]);

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
      } catch { /* ignore */ }
    }
  }, [linkedSessionId, token, showToast, lang, API_BASE]);

  const handleConfirmDeparture = useCallback(async () => {
    if (!linkedSessionId) return;
    try {
      await axios.post(`${API_BASE}/safety/sessions/${linkedSessionId}/departure`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? 'Klient odešel, odjezd potvrzen.' : 'Client left, departure confirmed.', 'success');
    } catch (_err) { console.error(_err); }
  }, [linkedSessionId, token, showToast, lang, API_BASE]);

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

  const handleDeleteNote = useCallback((client, noteId) => {
    setClientNotes(prev => ({ ...prev, [client]: (prev[client] || []).filter(n => n.id !== noteId) }));
  }, []);

  const handleIncomingCall = useCallback((data) => setIncomingRelayCall(data), []);
  const handleEmergencyAlert = useCallback(() => showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error'), [showToast, lang]);

  // Global settings now handled by useNexusData hook

  const handleRelayCommand = useCallback(async (data) => {
    if (!data) return;
    const isCommand = data.type === 'send_sms' || data.targetType === 'relay_command' || !!data.messageId;
    if (!isCommand) return;
    showToast(lang === 'cz' ? '📥 Přijat příkaz k odeslání SMS' : '📥 SMS relay command received', 'info');
    if (!isRelayActive) {
      showToast(lang === 'cz' ? '⚠️ Relay je neaktivní' : '⚠️ Relay is inactive', 'warning');
      return;
    }
    const messageId = data.messageId || data.id;
    const to = data.to || data.phoneNumber || data.phone;
    const text = data.content || data.text || data.body;
    if (!to || !text) return;

    const logId = addRelayLog('sms', to, text, 'outbound', 'pending');
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (plugin) {
        const result = await plugin.sendSms({ to, text, simSlot: relaySimSlot === 'auto' ? null : parseInt(relaySimSlot) });
        updateRelayLogStatus(logId, 'sent');
        showToast(lang === 'cz' ? `SMS pro ${to} odeslána.` : `SMS for ${to} sent.`, 'success');
        if (messageId) {
          await axios.patch(`${API_BASE}/messages/${messageId}/status`, { status: 'sent', result: JSON.stringify(result) }, { headers: { Authorization: `Bearer ${token}` } });
          updateRelayLogStatus(logId, 'forwarded');
        }
      } else showToast(lang === 'cz' ? 'Relay plugin nedostupný' : 'Relay plugin unavailable', 'error');
    } catch (_err) {
      updateRelayLogStatus(logId, 'failed');
      showToast(lang === 'cz' ? `SMS selhala: ${_err.message}` : `SMS failed: ${_err.message}`, 'error');
      if (messageId) axios.patch(`${API_BASE}/messages/${messageId}/status`, { status: 'failed', _err: _err.message }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }, [token, isRelayActive, relaySimSlot, lang, showToast, addRelayLog, updateRelayLogStatus, API_BASE]);

  // --- 9. LIFECYCLE EFFECTS ---
  useEffect(() => {
    if (!checkinTimerEnd) return;
    checkinIntervalRef.current = setInterval(() => {
      const remaining = checkinTimerEnd - Date.now();
      if (remaining <= 0) {
        clearInterval(checkinIntervalRef.current);
        setCheckinTimerEnd(null);
        setCheckinRemaining(null);
        triggerSOS('timer_expired');
      } else setCheckinRemaining(remaining);
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
        await axios.post(`${API_BASE}/sos/${sosAlertId}/location`, { lat, lng, accuracy, capturedAt: timestamp }, { headers: { Authorization: `Bearer ${token}` } });
      } catch { /* ignore */ }
    }, 15000);
    return () => clearInterval(gpsWatchRef.current);
  }, [sosActive, sosAlertId, token, getGPSPosition, API_BASE]);

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
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('').toUpperCase();
      const keywords = ['HELP', 'POMOC', 'SOS', 'STOP', 'NEMŮŽU', 'POMOZ', 'POLICIE'];
      if (keywords.some(k => transcript.includes(k))) {
        triggerSOS('voice');
        setVoiceGuardianActive(false);
      }
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        showToast(lang === 'cz' ? 'Přístup k mikrofonu zamítnut.' : 'Microphone access denied.', 'error');
        setVoiceGuardianActive(false);
      }
    };
    recognition.onend = () => {
      if (voiceGuardianActive && !sosActive) {
        setTimeout(() => { try { if (voiceGuardianActive && !sosActive) recognition.start(); } catch (err) { console.warn('Speech recognition restart failed:', err); } }, 2000);
      }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (err) { console.warn('Speech recognition start failed:', err); }
    return () => { if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); } };
  }, [voiceGuardianActive, sosActive, lang, triggerSOS, showToast]);

  useEffect(() => {
    if (!navigator.getBattery) return;
    let bInst = null;
    const h = (e) => { const b = e.target || bInst; if (b) setBatteryLevel(Math.floor(b.level * 100)); };
    navigator.getBattery().then(b => { bInst = b; setBatteryLevel(Math.floor(b.level * 100)); b.addEventListener('levelchange', h); });
    return () => bInst?.removeEventListener('levelchange', h);
  }, []);

  // --- 10. NEXUS DATA HOOK (Authenticated Layer) ---
  const nexusData = useNexusData({
    token, isLoggedIn, API_BASE, activeProfileId,
    setActiveOperator: memoizedSetActiveOperator,
    normalizeProfileId: memoizedNormalizeProfileId,
    setMessages: memoizedSetMessages,
    setActiveSafetySession: memoizedSetActiveSafetySession,
    setIsTimerActive: memoizedSetIsTimerActive,
    setTimeLeft: memoizedSetTimeLeft,
    showToast, lang
  });

  const activeOperator = useMemo(() => {
    const combined = { ...(authUser || {}), ...(activeOperatorState || {}) };
    const finalId = combined.id || combined._id || combined.userId;
    if (!finalId) return null;
    const rawRole = (combined.role?.name || combined.role || '').toUpperCase();
    const name = combined.fullname || combined.name || combined.username || (combined.email?.split('@')[0] || '');
    return {
      ...combined, id: finalId, name: name || 'User', role: rawRole,
      avatar: combined.avatar || (name ? name.charAt(0) : 'U'),
      isAdmin: ['AGENCY ADMIN', 'OWNER'].includes(rawRole),
      isManager: ['MANAGER', 'SENIOR MANAGER', 'SENIOR OPERATOR'].includes(rawRole),
      isAppOwner: ['APP OWNER', 'SUPER_ADMIN', 'SYSTEM ADMIN', 'ROOT'].includes(rawRole),
      isModel: ['MODEL', 'MODELKA'].includes(rawRole)
    };
  }, [activeOperatorState, authUser]);

  const { activeRole, isAllowed } = usePermissions(activeOperator, nexusData.rolePermissions);

  const onDelayBooking = useCallback(async (id, mins) => {
    const drafts = await nexusData.handleDelayBooking(id, mins);
    if (linkedSessionId === id && checkinTimerEnd) setCheckinTimerEnd(p => p + (mins * 60 * 1000));
    if (drafts?.length > 0) {
      setPendingNotifications(prev => {
        const existing = new Set(prev.map(p => p.bookingId));
        return [...prev, ...drafts.filter(d => !existing.has(d.bookingId))];
      });
    }
  }, [nexusData, linkedSessionId, checkinTimerEnd]);

  const syncRelayToNative = useCallback(async (active) => {
    if (!Capacitor.isNativePlatform() || !window.Capacitor?.Plugins?.NexusRelay) return;
    
    const profileId = activeOperator?.profileId || activeOperator?.activeProfileId || localStorage.getItem('nexus_last_profile_id');
    const operatorId = activeOperator?.id || 'RELAY-01';
    
    // Prevent redundant calls if parameters haven't changed
    const configKey = `${active}_${operatorId}_${profileId}_${relaySimSlot}`;
    if (lastRelayConfigRef.current === configKey) return;
    
    try {
      const RELAY_API_BASE = API_BASE.replace(/\/api$/, '');
      await window.Capacitor.Plugins.NexusRelay.configureRelay({
        baseUrl: `${RELAY_API_BASE}/api/device/relay`,
        deviceId: operatorId,
        installationId: localStorage.getItem('nexus_installation_id') || null,
        profileId: profileId || null,
        isActive: active,
        simSlot: relaySimSlot === 'auto' ? null : parseInt(relaySimSlot)
      });
      lastRelayConfigRef.current = configKey;
      console.log(`[Nexus-Relay] Native sync successful: active=${active}, profileId=${profileId}`);
    } catch (_err) { 
      console.warn('[Nexus-Relay] Native sync failed:', _err); 
    }
  }, [API_BASE, activeOperator?.id, activeOperator?.profileId, activeOperator?.activeProfileId, relaySimSlot]);

  // Persistent Relay Lifecycle
  useEffect(() => {
    if (isLoggedIn && activeOperator?.isModel && !isRelayActive && localStorage.getItem('nexus_relay_ever_enabled') !== 'true') {
      setIsRelayActive(true);
      localStorage.setItem('nexus_relay_active', 'true');
      localStorage.setItem('nexus_relay_ever_enabled', 'true');
    }
  }, [isLoggedIn, activeOperator?.isModel, isRelayActive]);

  useEffect(() => { 
    if (isLoggedIn) {
      syncRelayToNative(isRelayActive); 
    }
  }, [isLoggedIn, isRelayActive, syncRelayToNative]);

  useSocket(token, (d) => d?.message && setMessages(p => [...p.slice(-199), d.message]), (d) => d?.message && setMessages(p => p.map(m => m.id === d.message.id ? { ...m, ...d.message } : m)), handleIncomingCall, handleEmergencyAlert, () => {}, handleRelayCommand, (d) => d?.type === 'SYNC_COMPLETED' && showToast(lang === 'cz' ? '✅ Synchronizace dokončena' : '✅ Sync completed', 'success'));

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    initPushNotifications(API_BASE, token, async (n, tapped) => {
      const d = n?.data;
      if (tapped && d?.chatId) { setSelectedChatId(d.chatId); setActiveTab('inbox'); }
      if (d?.type === 'safety_alert') showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
      if (d) handleRelayCommand(d);
    });
    return () => removePushListeners();
  }, [isLoggedIn, token, showToast, lang, handleRelayCommand, API_BASE]);

  const profiles = useMemo(() => nexusData.profiles || [], [nexusData.profiles]);
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    
    const opId = String(activeOperator.id || '').toLowerCase();
    const roleNameClean = normalizeRole(activeRole || activeOperator?.role?.name || activeOperator?.role);
    
    // Roles that should see ALL profiles in their agency
    const isAgencyLevel = [
      'agency_admin', 'manager', 'senior_manager', 'senior_operator', 'owner'
    ].includes(roleNameClean);

    let filtered = (activeOperator.isAppOwner || isAgencyLevel) ? [...profiles] : profiles.filter(p => {
      const isAssigned = String(p.userId || p.ownerId || p.owner_id || '').toLowerCase() === opId || 
                        (Array.isArray(p.assignees) && p.assignees.some(a => String(a?.id || a).toLowerCase() === opId)) ||
                        (Array.isArray(p.operators) && p.operators.some(o => String(o?.id || o).toLowerCase() === opId));
      return isAssigned;
    });

    return filtered;
  }, [profiles, activeOperator, activeRole]);

  useEffect(() => {
    if (activeOperator?.isModel && activeProfileId === 'all' && myProfiles.length > 0) setActiveProfileId(String(myProfiles[0].id));
  }, [activeOperator, activeProfileId, myProfiles, setActiveProfileId]);

  const fetchPlans = useCallback(async () => {
    try {
      setIsPlansLoading(true);
      const res = await axios.get(`${API_BASE}/subscriptions/plans`, { headers: { Authorization: `Bearer ${token}` } });
      setSubscriptionPlans(res.data);
    } catch (err) { console.warn('Failed to fetch plans', err); } finally { setIsPlansLoading(false); }
  }, [API_BASE, token]);

  const activeProfile = useMemo(() => (profiles || []).find(p => p.id === activeProfileId) || myProfiles[0] || null, [profiles, activeProfileId, myProfiles]);

  const filteredMessages = useMemo(() => {
    let base = messages || [];
    if (activeOperator?.isModel) {
      const ids = new Set(myProfiles.map(p => String(p.id)));
      base = base.filter(m => ids.has(String(m.profileId || m.profile_id)));
    }
    return activeProfileId === 'all' ? base : base.filter(m => String(m.profileId || m.profile_id) === String(activeProfile?.id || ''));
  }, [messages, activeProfile, activeProfileId, activeOperator, myProfiles]);

  const selectedChat = useMemo(() => (messages || []).find(m => m.id === selectedChatId) || null, [messages, selectedChatId]);
  const chatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    const hist = (chatHistory || []).filter(m => String(m.chatId) === String(selectedChatId));
    return hist.length > 0 ? hist : (messages || []).filter(m => String(m.chatId) === String(selectedChatId));
  }, [messages, selectedChatId, chatHistory]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!token || !chatId) return;
    try {
      setIsHistoryLoading(true);
      const res = await axios.get(`${API_BASE}/messages/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
      setChatHistory((res.data || []).map(m => ({ ...m, time: new Date(m.createdAt || m.timestamp || Date.now()).toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }) })));
    } catch (err) { console.warn('Failed to fetch chat history', err); } finally { setIsHistoryLoading(false); }
  }, [API_BASE, token, lang]);

  useEffect(() => {
    if (selectedChatId) { setChatHistory([]); fetchChatMessages(selectedChatId); }
    else setChatHistory([]);
  }, [selectedChatId, fetchChatMessages]);

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim() || !selectedChatId || !token) return;
    const tempId = Date.now();
    const txt = text.trim();
    const opt = { id: tempId, chatId: selectedChatId, direction: 'OUTBOUND', text: txt, status: 'sending', time: new Date().toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }), senderName: activeOperator?.name || 'Me' };
    setMessages(prev => prev.map(m => m.chatId === selectedChatId ? { ...m, text: txt, status: 'sent' } : m));
    setChatHistory(prev => [...prev, opt]);
    setMessageValue("");
    try {
      const res = await axios.post(`${API_BASE}/messages`, { chatId: selectedChatId, text: txt, direction: 'OUTBOUND' }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data) setChatHistory(prev => prev.map(m => m.id === tempId ? { ...res.data, time: new Date(res.data.createdAt).toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }), senderName: res.data.sender?.name || activeOperator?.name || 'Me' } : m));
    } catch { showToast(lang === 'cz' ? 'Zprávu se nepodařilo odeslat.' : 'Failed to send message.', 'error'); setChatHistory(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m)); }
  }, [selectedChatId, token, lang, activeOperator, showToast, API_BASE]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim() || !token) return;
    try {
      setIsTranslating(true); setTranslatedText("");
      const target = { 'cs': 'češtiny', 'en': 'angličtiny', 'de': 'němčiny', 'fr': 'francouzštiny', 'es': 'španělštiny' }[translateTargetLang] || translateTargetLang;
      const res = await axios.post(`${API_BASE}/ai/test`, { prompt: `Text k překladu:\n"""\n${sourceText}\n"""`, system: `Přelož do ${target}. Vrať POUZE čistý překlad.` }, { headers: { Authorization: `Bearer ${token}` } });
      setTranslatedText(res.data.response || res.data.translated);
    } catch { showToast(lang === 'cz' ? "Překlad selhal" : "Translation failed", "error"); } finally { setIsTranslating(false); }
  }, [sourceText, token, lang, translateTargetLang, showToast, API_BASE]);

  const handleSaveNote = useCallback(() => {
    if (!internalNote.trim() || !selectedChat) return;
    const from = selectedChat.from;
    setClientNotes(prev => ({ ...prev, [from]: [...(prev[from] || []), { id: Date.now(), text: internalNote, author: activeOperator?.name, timestamp: new Date().toLocaleTimeString() }] }));
    setInternalNote("");
  }, [internalNote, selectedChat, activeOperator]);

  const handleQuickSaveMeeting = useCallback(() => {
    if (detectedMeeting) { 
      nexusData.handleQuickSaveMeeting(detectedMeeting); 
      setDetectedMeeting(null); 
    }
  }, [detectedMeeting, nexusData]);

  const logoutStable = useCallback(() => {
    logout();
    setShowLanding(true);
  }, [logout]);

  // --- 11. AGENCY & REFERRAL HANDLERS (App Owner / Admin) ---
  const handleDeleteAgency = useCallback(async (id) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/agency/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast(lang === 'cz' ? 'Agentura byla odstraněna.' : 'Agency deleted.', 'success');
      nexusData.initData(); // Refresh list
    } catch (_err) {
      showToast(lang === 'cz' ? 'Odstranění selhalo.' : 'Delete failed.', 'error');
    }
  }, [token, lang, showToast, nexusData.initData, API_BASE]);

  const handleImpersonateAgency = useCallback(async (id) => {
    // Placeholder for impersonation logic (requires backend endpoint)
    showToast(lang === 'cz' ? 'Impersonifikace zatím není dostupná.' : 'Impersonation not yet available.', 'info');
    return null;
  }, [lang, showToast]);

  const fetchAllReferrals = useCallback(async () => {
    if (!token) return [];
    try {
      const res = await axios.get(`${API_BASE}/referrals/admin/all`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data || [];
    } catch {
      return [];
    }
  }, [token, API_BASE]);

  const handleConfirmReferral = useCallback(async (id, rewardAmount) => {
    if (!token) return;
    try {
      const res = await axios.post(`${API_BASE}/referrals/${id}/confirm`, { rewardAmount }, { headers: { Authorization: `Bearer ${token}` } });
      showToast(lang === 'cz' ? 'Odměna potvrzena.' : 'Reward confirmed.', 'success');
      return res.data;
    } catch {
      showToast(lang === 'cz' ? 'Potvrzení selhalo.' : 'Confirmation failed.', 'error');
      return null;
    }
  }, [token, lang, showToast, API_BASE]);

  // --- 12. ANDROID BACK BUTTON HANDLING ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const back = CapacitorApp.addListener('backButton', () => {
      if (isSidebarOpen) { setIsSidebarOpen(false); return; }
      if (nexusData.isBookingModalOpen) { nexusData.setIsBookingModalOpen(false); return; }
      if (isBugReportOpen) { setIsBugReportOpen(false); return; }
      if (isAddAgencyOpen) { setIsAddAgencyOpen(false); return; }
      if (isAddUserOpen) { setIsAddUserOpen(false); return; }
      if (agencyDetailModalData) { setAgencyDetailModalData(null); return; }
      if (selectedChatId || mobileView === 'chat') { setSelectedChatId(null); setMobileView('list'); return; }
      if (activeTab !== 'dashboard') { setActiveTab('dashboard'); return; }
      CapacitorApp.exitApp();
    });
    return () => back.then(l => l.remove());
  }, [isSidebarOpen, nexusData.isBookingModalOpen, isBugReportOpen, isAddAgencyOpen, isAddUserOpen, agencyDetailModalData, selectedChatId, mobileView, activeTab]);

  const value = useMemo(() => ({
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    loading: nexusData.isDataLoading, activeOperator, activeRole, isAllowed, isLoggedIn, token,
    logout: logoutStable, onLogin: handleLogin, onRegisterAgency: auth.handleRegisterAgency, onRegisterUser: auth.handleRegisterUser,
    isAppOwner: activeOperator?.isAppOwner || false, isManager: activeOperator?.isManager || false, isAdmin: activeOperator?.isAdmin || false,
    API_BASE, showLanding: showLanding ?? !isLoggedIn, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    updatePlans: async (p) => { try { setIsPlansLoading(true); await axios.post(`${API_BASE}/subscriptions/config`, { plans: p }, { headers: { Authorization: `Bearer ${token}` } }); setSubscriptionPlans(p); return { success: true }; } catch (e) { return { success: false, error: e.message }; } finally { setIsPlansLoading(false); } },
    fetchPlans, subscriptionPlans, isPlansLoading, showToast, contextToasts: _toasts,
    isMobile, isNativeApp, isSidebarCollapsed, setIsSidebarCollapsed, mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab, sourceText, setSourceText, translatedText, setTranslatedText, isTranslating, setIsTranslating,
    internalNote, setInternalNote, clientNotes, detectedMeeting, setDetectedMeeting, typingProfiles, setTypingProfiles,
    activeContextTab, setActiveContextTab, translateTargetLang, setTranslateTargetLang,
    showPanicConfirm, setShowPanicConfirm, chatScrollRef, isUserScrolled, incomingRelayCall, setIncomingRelayCall,
    activeSafetySession, sosActive, linkedSessionId, checkinMinutes, setCheckinMinutes,
    checkinTimerEnd, checkinRemaining, triggerSOS, cancelSOS, startCheckinTimer, resetCheckinTimer, confirmDeparture: handleConfirmDeparture,
    pendingNotifications, setPendingNotifications, onDelayBooking,
    agencyDetailModalData, setAgencyDetailModalData, isAddAgencyOpen, setIsAddAgencyOpen,
    isBugReportOpen, setIsBugReportOpen, isAddUserOpen, setIsAddUserOpen, addUserModalAgencyId, setAddUserModalAgencyId,
    SAFETY_SUGGESTIONS: ['15m', '30m', '45m', '60m', '1.5h', '2h'],
    handleAddAgency: () => setIsAddAgencyOpen(true),
    handleAgencyDetail: (agency) => setAgencyDetailModalData(agency),
    handleEditProfile: (profile) => { setEditingProfileData(profile); setIsEditProfileOpen(true); },
    isEditProfileOpen, setIsEditProfileOpen, editingProfileData, setEditingProfileData,
    handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote, startCall: () => showToast(lang === 'cz' ? 'Inicializace VoIP...' : 'Initializing VoIP...', 'info'), 
    handleQuickSaveMeeting,
    activeProfile, activeProfileId, setActiveProfileId, profiles, myProfiles, onlineOnly, setOnlineOnly, 
    agencies: nexusData.agencies, stats: nexusData.stats, operators: nexusData.operators, setProfiles: nexusData.setProfiles,
    toggleOperatorStatus: nexusData.toggleOperatorStatus, handleSaveAssignees: nexusData.handleSaveAssignees,
    handleDeleteAgency, handleImpersonateAgency, fetchAllReferrals, handleConfirmReferral,
    isSyncing: nexusData.isSyncing, syncStatus: nexusData.syncStatus, syncProgress: nexusData.syncProgress,
    relayOnline: nexusData.relayOnline, handleSyncAll: nexusData.handleSyncAll, handleSyncChatHistory: nexusData.handleSyncChatHistory,
    handleSaveBio: nexusData.handleSaveBio, handleSaveCredentials: nexusData.handleSaveCredentials,
    bioText: nexusData.bioText, setBioText: nexusData.setBioText,
    globalFeatures: nexusData.globalFeatures, handleFeatureToggle: nexusData.handleFeatureToggle,
    globalSettings: nexusData.globalSettings, handleUpdateGlobalSetting: nexusData.handleUpdateGlobalSetting,
    isTraining: nexusData.isTraining, trainingProgress: nexusData.trainingProgress,
    onStartTraining: nexusData.onStartTraining, onResetTraining: nexusData.onResetTraining,
    calendar: nexusData.calendar, bookingSchedule: nexusData.calendar,
    isBookingModalOpen: nexusData.isBookingModalOpen, setIsBookingModalOpen: nexusData.setIsBookingModalOpen,
    newBookingForm: nexusData.newBookingForm, setNewBookingForm: nexusData.setNewBookingForm,
    handleSaveBooking: nexusData.handleSaveBooking,
    isSidebarOpen, setIsSidebarOpen, totalUnread: (messages || []).length, messages, filteredMessages, selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, setIsHistoryLoading,
    isRelayActive, setIsRelayActive: setRelayActiveStable, 
    relaySimSlot, setRelaySimSlot, relayLogs, setRelayLogs, addRelayLog, updateRelayLogStatus,
    linkedTrackerId, setLinkedTrackerId, trackerStatus, setTrackerStatus,
    messageValue, setMessageValue, calViewDate, setCalViewDate, 
    _gpsHistory, lastTrackerUpdate, voiceGuardianActive, handleToggleVoiceGuardian,
    batteryLevel, incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    heartRate, setHeartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected,
    isTvMode, tvToken, activeBioWarning, setActiveBioWarning, playBeep, triggerSilentSOS,
    audioSentinelActive, setAudioSentinelActive, isPinModalOpen, setIsPinModalOpen, pinModalPromise, setPinModalPromise,
    handleRelayCommand, checkRelayStatus, checkProfileHealth, selectedServerId, setSelectedServerId, availableServers
  }), [
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    nexusData, activeOperator, activeRole, isAllowed, isLoggedIn, token, logoutStable, handleLogin, auth,
    showLanding, hasSeenOnboarding, showOnboarding, subscriptionPlans, isPlansLoading, showToast, _toasts,
    isMobile, isNativeApp, isSidebarCollapsed, mobileView, inlinePanelTab, sourceText, translatedText, isTranslating,
    internalNote, clientNotes, detectedMeeting, typingProfiles, activeContextTab, translateTargetLang,
    showPanicConfirm, incomingRelayCall, activeSafetySession, sosActive, linkedSessionId, checkinMinutes,
    checkinTimerEnd, checkinRemaining, pendingNotifications, agencyDetailModalData, isAddAgencyOpen,
    isBugReportOpen, isAddUserOpen, addUserModalAgencyId, isEditProfileOpen, editingProfileData,
    activeProfile, activeProfileId, profiles, myProfiles, onlineOnly, selectedChatId, selectedChat, chatMessages, chatHistory, isHistoryLoading,
    isRelayActive, setRelayActiveStable, relaySimSlot, relayLogs, linkedTrackerId, trackerStatus, messageValue, calViewDate, 
    _gpsHistory, lastTrackerUpdate, voiceGuardianActive, batteryLevel, incomingGhostCall, ghostCallScheduledAt,
    heartRate, hrThreshold, isBluetoothConnected, isTvMode, tvToken, activeBioWarning, audioSentinelActive,
    isPinModalOpen, pinModalPromise, availableServers, selectedServerId, API_BASE, handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote, handleQuickSaveMeeting, handleConfirmDeparture, onDelayBooking, handleToggleVoiceGuardian, triggerGhostCall, verifyIdentity, playBeep, triggerSilentSOS, handleRelayCommand, checkRelayStatus, checkProfileHealth, fetchChatMessages, fetchPlans,
    handleDeleteAgency, handleImpersonateAgency, fetchAllReferrals, handleConfirmReferral
  ]);


  useEffect(() => {
    localStorage.setItem('nexus_lang', lang);
    localStorage.setItem('nexus_active_tab', activeTab);
    localStorage.setItem('nexus_active_market', activeMarket);
    if (activeProfileId) localStorage.setItem('nexus_active_profile_id', activeProfileId);
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!isLoggedIn) {
        const target = showLanding ? '/' : '/login';
        if (currentPath !== target) window.history.replaceState(null, '', target);
      } else {
        const target = `/${activeTab}`;
        if (activeTab && currentPath !== target) window.history.replaceState(null, '', target);
      }
    }
  }, [lang, activeTab, activeMarket, activeProfileId, isLoggedIn, showLanding]);

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
};
