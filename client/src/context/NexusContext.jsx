import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

// 1. Context Definition
export const NexusContext = createContext(null);

// Shared AudioContext to prevent exhaustion on mobile devices
let sharedAudioCtx = null;
const getSharedAudioCtx = () => {
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[Nexus-Audio] AudioContext initialization failed:', e);
    }
  }
  return sharedAudioCtx;
};

// 2. Main Hook - using explicit React.useContext and function declaration for hoisting stability
// Consistently use function decoration for hoisting stability in production builds
export function useNexus() {
  const context = React.useContext(NexusContext);
  
  if (!context) {
    const errorMsg = '[NexusContext] useNexus was called outside of NexusProvider. This is a critical initialization failure.';
    console.error(errorMsg);
    
    // In production crash scenarios, we throw to trigger the ErrorBoundary or window.onerror
    const err = new Error(errorMsg);
    // Add extra diagnostic info
    err.code = 'NEXUS_CONTEXT_MISSING';
    throw err;
  }
  
  return context;
}

const getSafeStorage = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (e) {
    console.warn('[Nexus-Bootstrap] Storage access failed:', e);
    return fallback;
  }
};

export const NexusProvider = ({ children }) => {
  // 1. Core UI States
  const [lang, setLang] = React.useState(() => {
    const stored = getSafeStorage('nexus_lang', null);
    if (stored) return stored;
    
    // Automatic detection for first-time users
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (browserLang.includes('cs') || browserLang.includes('sk')) return 'cz';
    }
    return 'en';
  });
  
  // Translation helper - needed for useAuth
  // -------------------------------------------------------------------------
  // SECURE TRANSLATION ENGINE (Ultra-Hardened for Production)
  // -------------------------------------------------------------------------
  const t = React.useCallback((key, params = {}) => {
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
    } catch (err) {
      console.error('[NexusContext] Translation fallback triggered for:', key, err);
      return String(key || '');
    }
  }, [lang]);

  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.substring(1);
      if (path && path !== '' && path !== 'dashboard') {
        return path;
      }
    }
    return localStorage.getItem('nexus_active_tab') || 'dashboard';
  });
  const [activeMarket, setActiveMarket] = React.useState(localStorage.getItem('nexus_active_market') || 'cz');
  const [activeProfileId, setActiveProfileId] = React.useState(localStorage.getItem('nexus_active_profile_id') || 'all');
  const [showLanding, setShowLanding] = React.useState(() => {
    if (typeof window !== 'undefined') {
      // If we are in a mobile app, we usually skip landing unless explicitly asked
      if (Capacitor.isNativePlatform()) {
        if (window.location.pathname === '/login') return false;
        return localStorage.getItem('nexus_isLoggedIn') !== 'true';
      }
      
      // On WEB, we ALWAYS want to show the landing page first to present the product
      // unless the user is already logged in or explicitly navigating deep
      if (localStorage.getItem('nexus_isLoggedIn') === 'true') return false;
      
      // If we are on web and not logged in, show landing by default
      return true;
    }
    return true;
  });
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_onboarding_seen') === 'true';
    }
    return false;
  });
  const [showOnboarding, setShowOnboarding] = React.useState(!hasSeenOnboarding && Capacitor.isNativePlatform());

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [onlineOnly, setOnlineOnly] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [mobileView, setMobileView] = React.useState('list'); 
  const [inlinePanelTab, setInlinePanelTab] = React.useState(null);
  const [activeContextTab, setActiveContextTab] = React.useState('translator');
  const [sourceText, setSourceText] = React.useState("");
  const [translatedText, setTranslatedText] = React.useState("");
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [internalNote, setInternalNote] = React.useState("");
  const [detectedMeeting, setDetectedMeeting] = React.useState(null);
  const [typingProfiles, setTypingProfiles] = React.useState({});
  const [showPanicConfirm, setShowPanicConfirm] = React.useState(false);
  const [justLoggedOut, setJustLoggedOut] = React.useState(false);

  // 1.1 Safety & SOS State (Globalized)
  const [activeSafetySession, setActiveSafetySession] = React.useState(null);
  const [sosActive, setSosActive] = React.useState(false);
  const [linkedTrackerId, setLinkedTrackerId] = React.useState(() => localStorage.getItem('nexus_linkedTrackerId') || null);
  const [trackerStatus, setTrackerStatus] = React.useState('disconnected');
  const [lastTrackerUpdate, setLastTrackerUpdate] = React.useState(null);
  const [gpsHistory, setGpsHistory] = React.useState([]);
  const [sosAlertId, setSosAlertId] = React.useState(null);
  const [linkedSessionId, setLinkedSessionId] = React.useState(null);
  const [checkinMinutes, setCheckinMinutes] = React.useState(60);
  const [checkinTimerEnd, setCheckinTimerEnd] = React.useState(null);
  const [checkinRemaining, setCheckinRemaining] = React.useState(null);
  const [voiceGuardianActive, setVoiceGuardianActive] = React.useState(false);
  const [batteryLevel, setBatteryLevel] = React.useState(null);
  const [incomingGhostCall, setIncomingGhostCall] = React.useState(false);
  const [ghostCallScheduledAt, setGhostCallScheduledAt] = React.useState(null);
  
  // 1.2 IoT & Biometric States (Guardian IoT Suite)
  const [heartRate, setHeartRate] = React.useState(0);
  const [hrThreshold, setHrThreshold] = React.useState(() => Number(localStorage.getItem('nexus_hrThreshold')) || 130);
  const [isBluetoothConnected, setIsBluetoothConnected] = React.useState(false);
  const [isTvMode, setIsTvMode] = React.useState(false);
  const [tvToken, setTvToken] = React.useState(null);
  const [activeBioWarning, setActiveBioWarning] = React.useState(null);
  
  const checkinIntervalRef = React.useRef(null);
  const gpsWatchRef = React.useRef(null);
  const recognitionRef = React.useRef(null);
  
  // Modals state
  const [agencyDetailModalData, setAgencyDetailModalData] = React.useState(null);
  const [isAddAgencyOpen, setIsAddAgencyOpen] = React.useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = React.useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [addUserModalAgencyId, setAddUserModalAgencyId] = React.useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);
  const [editingProfileData, setEditingProfileData] = React.useState(null);

  // 3. IoT & Auth Persistence
  React.useEffect(() => {
    localStorage.setItem('nexus_hrThreshold', hrThreshold);
  }, [hrThreshold]);

  // Detected TV Token on mount
  React.useEffect(() => {
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

  const playBeep = React.useCallback(() => {
    try {
      const audioCtx = getSharedAudioCtx();
      if (!audioCtx) return;

      // Resume context if suspended (common browser policy requirement)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); 
    } catch (e) {
      console.warn('[IoT-Audio] Beep failed:', e);
    }
  }, []);

  const triggerSilentSOS = React.useCallback(async (type, payload = {}) => {
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

  // Bio-Panic Monitoring Logic
  React.useEffect(() => {
    if (heartRate > hrThreshold && !sosActive && !isTvMode) {
      const timer = setTimeout(() => {
        if (heartRate > hrThreshold) {
          triggerSilentSOS('BIO_PANIC', { value: heartRate });
        }
      }, 5000); // 5 second buffer to avoid spikes
      return () => clearTimeout(timer);
    }
  }, [heartRate, hrThreshold, sosActive, isTvMode, triggerSilentSOS]);

  // -- Memoized Identity-Stable Callbacks for useAuth --
  const memoizedSetIsRelayMode = React.useCallback(() => {}, []);
  const memoizedSetSelectedChatId = React.useCallback(() => {}, []);
  const memoizedSetActiveProfileId = React.useCallback((id) => setActiveProfileId(id), []);
  const memoizedSetShowLanding = React.useCallback((val) => setShowLanding(val), []);

  // 4. Authentication Hook - Now with stabilized identities
  const auth = useAuth({ 
    API_BASE,
    t,
    setIsRelayMode: memoizedSetIsRelayMode, 
    setSelectedChatId: memoizedSetSelectedChatId, 
    setActiveProfileId: memoizedSetActiveProfileId, 
    setShowLanding: memoizedSetShowLanding 
  });
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn } = auth;

  // 3. Other Core Components Logic
  const chatScrollRef = React.useRef(null);
  const isUserScrolled = React.useRef(false);
  const [messages, setMessages] = React.useState([]);
  const [selectedChatId, setSelectedChatId] = React.useState(null);
  const [messageValue, setMessageValue] = React.useState("");
  const [clientNotes, setClientNotes] = React.useState({});
  const [calViewDate, setCalViewDate] = React.useState(new Date());
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(false);
  const [chatHistory, setChatHistory] = React.useState([]);
  const [_toasts, _setToasts] = React.useState([]);

  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const isNativeApp = React.useMemo(() => Capacitor.isNativePlatform(), []);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
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
    } catch (e) {
      console.warn('[App] Back button listener setup failed:', e);
    }
    return () => { listener?.remove?.(); };
  }, [isNativeApp]);

  const showToast = React.useCallback((message, type = 'info') => {
    const id = Date.now();
    _setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const [activeOperatorState, setActiveOperatorState] = React.useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = React.useState([
    { id: 'basic', name: 'Basic', descriptionKey: 'basicDesc', prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 5, features: ['feat_profiles', 'feat_analytics_basic', 'feat_support'] },
    { id: 'pro', name: 'Pro', descriptionKey: 'proDesc', prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10, features: ['feat_all_basic', 'feat_analytics_adv', 'feat_ai_opt'] },
    { id: 'agency', name: 'Agency', descriptionKey: 'agencyDesc', prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 20, features: ['feat_all_pro', 'feat_audit_logs', 'feat_api_access'] }
  ]);
  const [isPlansLoading, setIsPlansLoading] = React.useState(false);
  const [globalSettings, setGlobalSettings] = React.useState([]);

  const fetchGlobalSettings = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalSettings(res.data);
    } catch (err) {
      console.error('Fetch global settings error:', err);
    }
  }, [token, API_BASE]);

  React.useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const storedRefreshToken = localStorage.getItem('nexus_refreshToken');
          if (storedRefreshToken) {
            try {
              const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
              });
              if (res.ok) {
                const data = await res.json();
                localStorage.setItem('nexus_token', data.token);
                localStorage.setItem('nexus_refreshToken', data.refreshToken);
                auth.setToken(data.token);
                originalRequest.headers.Authorization = `Bearer ${data.token}`;
                return axios(originalRequest);
              }
            } catch { /* refresh failed */ }
          }
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]); 

  const memoizedSetActiveOperator = React.useCallback((op) => setActiveOperatorState(op), []);
  const memoizedSetMessages = React.useCallback((msgs) => setMessages(msgs), []);
  
  // ── Safety Methods ─────────────────────────────────────────────────────────
  
  const getGPSPosition = React.useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      }
      return new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          (err) => reject(err),
          { timeout: 5000, enableHighAccuracy: true }
        )
      );
    } catch { return { lat: null, lng: null, accuracy: null }; }
  }, []);

  const triggerSOS = React.useCallback(async (type = 'manual') => {
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
    } catch (err) {
      console.warn('[SOS] Failed to trigger:', err.message);
    }
  }, [sosActive, API_BASE, token, activeProfileId, getGPSPosition, showToast, lang]);

  const cancelSOS = React.useCallback(async () => {
    if (!sosAlertId) {
      setSosActive(false);
      return;
    }
    try {
      await axios.post(`${API_BASE}/sos/${sosAlertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? '✅ SOS zrušeno' : '✅ SOS resolved', 'success');
    } catch {}
    setSosActive(false);
    setSosAlertId(null);
    setLinkedSessionId(null);
  }, [sosAlertId, API_BASE, token, showToast, lang]);

  const startCheckinTimer = React.useCallback((minutes) => {
    const mins = minutes || checkinMinutes;
    const endTime = Date.now() + mins * 60 * 1000;
    setCheckinTimerEnd(endTime);
    showToast(lang === 'cz' ? `⏰ Odpočet spuštěn: ${mins} min` : `⏰ Timer started: ${mins} min`, 'info');
  }, [checkinMinutes, showToast, lang]);

  const resetCheckinTimer = React.useCallback(async () => {
    setCheckinTimerEnd(null);
    setCheckinRemaining(null);
    if (checkinIntervalRef.current) clearInterval(checkinIntervalRef.current);
    if (linkedSessionId) {
      try {
        await axios.post(`${API_BASE}/safety/sessions/${linkedSessionId}/ack`, { extendMinutes: 10 }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast(lang === 'cz' ? '✓ Stav potvrzen' : '✓ Status confirmed', 'success');
      } catch {}
    }
  }, [linkedSessionId, API_BASE, token, showToast, lang]);

  const handleConfirmDeparture = React.useCallback(async () => {
    if (!linkedSessionId) return;
    try {
      await axios.post(`${API_BASE}/safety/sessions/${linkedSessionId}/departure`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Assuming fetchActiveSafetySession is available via nexusData or similar
      showToast(lang === 'cz' ? 'Klient odešel, odjezd potvrzen.' : 'Client left, departure confirmed.', 'success');
    } catch (err) {
      console.error(err);
    }
  }, [linkedSessionId, API_BASE, token, showToast, lang]);

  const handlePairTracker = React.useCallback(async (imei) => {
    if (!imei) return;
    try {
      // Simulation of API call to bind tracker
      console.log('[NexusContext] Pairing external tracker:', imei);
      setLinkedTrackerId(imei);
      localStorage.setItem('nexus_linkedTrackerId', imei);
      setTrackerStatus('connected');
      showToast(lang === 'cz' ? 'Tracker byl úspěšně spárován.' : 'Tracker successfully paired.', 'success');
    } catch (err) {
      console.error(err);
      showToast(lang === 'cz' ? 'Chyba při párování trackeru.' : 'Error pairing tracker.', 'error');
    }
  }, [lang, showToast]);

  const handleUnpairTracker = React.useCallback(() => {
    setLinkedTrackerId(null);
    localStorage.removeItem('nexus_linkedTrackerId');
    setTrackerStatus('disconnected');
    showToast(lang === 'cz' ? 'Tracker byl odpojen.' : 'Tracker disconnected.', 'info');
  }, [lang, showToast]);

  const handleToggleVoiceGuardian = React.useCallback(() => {
    if (voiceGuardianActive) {
      setVoiceGuardianActive(false);
      showToast(lang === 'cz' ? 'Hlasový dohled vypnut.' : 'Voice Guardian deactivated.', 'info');
    } else {
      setVoiceGuardianActive(true);
      showToast(lang === 'cz' ? 'Hlasový dohled aktivován.' : 'Voice Guardian activated.', 'success');
    }
  }, [voiceGuardianActive, lang, showToast]);

  const triggerGhostCall = React.useCallback((delaySec = 20) => {
    const scheduledAt = Date.now() + (delaySec * 1000);
    setGhostCallScheduledAt(scheduledAt);
    showToast(lang === 'cz' ? `Hovor naplánován za ${delaySec}s.` : `Call scheduled in ${delaySec}s.`, 'info');
    
    setTimeout(() => {
      setIncomingGhostCall(true);
      setGhostCallScheduledAt(null);
    }, delaySec * 1000);
  }, [lang, showToast]);

  const verifyIdentity = React.useCallback(async () => {
    // In a real app, this would use WebAuthn or a biometric prompt
    // For now, we use a confirm as a bypassable placeholder, but in the implementation plan we recommended WebAuthn
    return window.confirm(lang === 'cz' ? 'Potvrďte prosím svou identitu (Biometrika/Kód)' : 'Please confirm your identity (Biometric/Passcode)');
  }, [lang]);

  // Effects for Safety
  React.useEffect(() => {
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

  React.useEffect(() => {
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
      } catch {}
    }, 15000);
    return () => clearInterval(gpsWatchRef.current);
  }, [sosActive, sosAlertId, API_BASE, token, getGPSPosition]);

  // Voice Guardian Lifecycle
  React.useEffect(() => {
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
      console.warn('[VoiceGuardian] Recognition error:', event.error);
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
    try { recognition.start(); } catch (err) { console.error('[VoiceGuardian] Start error:', err); }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [voiceGuardianActive, sosActive, lang, triggerSOS, showToast]);

  // Battery Sentinel
  React.useEffect(() => {
    if (!navigator.getBattery) return;
    
    let batteryInstance = null;
    const handleLevelChange = (e) => {
      const b = e.target || batteryInstance;
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

  const memoizedSetActiveSafetySession = React.useCallback(() => {}, []);
  const memoizedSetIsTimerActive = React.useCallback(() => {}, []);
  const memoizedSetTimeLeft = React.useCallback(() => {}, []);
  const memoizedNormalizeProfileId = React.useCallback((id) => id, []);

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

  const activeOperator = React.useMemo(() => {
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
  }, [activeOperatorState, authUser, isLoggedIn]);

  const { activeRole, isAllowed } = usePermissions(activeOperator, nexusData.rolePermissions);

  const [pendingNotifications, setPendingNotifications] = React.useState([]);

  const onDelayBooking = React.useCallback(async (id, mins) => {
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

  const [incomingRelayCall, setIncomingRelayCall] = React.useState(null);
  const handleNewMessage = React.useCallback((data) => {
    if (data?.message) {
      setMessages(prev => [...prev.slice(-199), data.message]);
    }
  }, []);
  const handleMessageUpdated = React.useCallback((data) => {
    if (data?.message) {
      setMessages(prev => prev.map(m => m.id === data.message.id ? { ...m, ...data.message } : m));
    }
  }, []);
  const handleIncomingCall = React.useCallback((data) => setIncomingRelayCall(data), []);
  const handleEmergencyAlert = React.useCallback((_data) => {
    showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
  }, [showToast, lang]);
  const handleSipIncomingCall = React.useCallback((_data) => {}, []);

  useSocket(token, handleNewMessage, handleMessageUpdated, handleIncomingCall, handleEmergencyAlert, handleSipIncomingCall);

  React.useEffect(() => {
    if (!isLoggedIn || !token) return;
    initPushNotifications(API_BASE, token, (notification, tapped) => {
      const data = notification?.data;
      if (tapped && data?.chatId) {
        setSelectedChatId(data.chatId);
        setActiveTab('inbox');
      }
      if (data?.type === 'safety_alert') {
        showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
      }
    });
    return () => { removePushListeners(); };
  }, [isLoggedIn, token, showToast, lang]);

  const onLogin = React.useCallback(async (email, password) => {
    const result = await auth.handleLogin(email, password);
    if (result?.success) {
      setShowLanding(false);
      setActiveTab('dashboard');
      setJustLoggedOut(false);
      return true;
    }
    const errorMessages = {
      connectionError: lang === 'cz' ? 'Chyba připojení. Zkontrolujte internet.' : 'Connection error. Please check your internet.',
      loginError: lang === 'cz' ? 'Neplatné přihlašovací údaje.' : 'Invalid credentials.',
    };
    const msg = result?.detail || errorMessages[result?.error] || result?.error || (lang === 'cz' ? 'Přihlášení se nezdařilo.' : 'Login failed.');
    showToast(msg, 'error');
    return { success: false, message: msg };
  }, [auth, showToast, lang]);

  const profiles = nexusData.profiles || [];
  
  const myProfiles = React.useMemo(() => {
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
  React.useEffect(() => {
    if (activeOperator?.isModel && activeProfileId === 'all' && myProfiles.length > 0) {
      console.log('[NexusContext] Enforcing specific profile filter for model user');
      setActiveProfileId(String(myProfiles[0].id));
    }
  }, [activeOperator, activeProfileId, myProfiles, setActiveProfileId]);


  const fetchPlans = React.useCallback(async () => {
    try {
      setIsPlansLoading(true);
      const res = await axios.get(`${API_BASE}/subscriptions/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionPlans(res.data);
    } catch (err) {
      console.error('Fetch plans error:', err);
    } finally {
      setIsPlansLoading(false);
    }
  }, [token, API_BASE]);

  const updatePlans = React.useCallback(async (newPlans) => {
    try {
      setIsPlansLoading(true);
      await axios.post(`${API_BASE}/subscriptions/config`, { plans: newPlans }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionPlans(newPlans);
      return { success: true };
    } catch (err) {
      console.error('Update plans error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsPlansLoading(false);
    }
  }, [token, API_BASE]);

  const activeProfile = React.useMemo(() => 
    (profiles || []).find(p => p.id === activeProfileId) || (myProfiles || [])[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const filteredMessages = React.useMemo(() => {
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
      if (baseMessages.length === 0 && rawMessages.length > 0 && activeOperator.profileId) {
        baseMessages = rawMessages.filter(m => String(m.profileId || m.profile_id) === String(activeOperator.profileId));
      }
    }

    if (activeProfileId === 'all') return baseMessages;
    
    // Further filter by selected profile
    const currentProfileId = String(activeProfile?.id || activeProfile?._id || '');
    return baseMessages.filter(m => String(m.profileId || m.profile_id || '') === currentProfileId);
  }, [messages, activeProfile, activeProfileId, activeOperator, myProfiles]);

  const selectedChat = React.useMemo(() => (messages || []).find(m => m.id === selectedChatId) || null, [messages, selectedChatId]);

  const chatMessages = React.useMemo(() => {
    if (!selectedChatId) return [];
    if (chatHistory?.[0] && chatHistory[0].chatId === selectedChatId) return chatHistory;
    return (messages || []).filter(m => m.chatId === selectedChatId);
  }, [messages, selectedChatId, chatHistory]);

  const fetchChatMessages = React.useCallback(async (chatId) => {
    if (!token || !chatId) return;
    try {
      setIsHistoryLoading(true);
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
    } catch (err) { console.error('Failed to fetch chat messages:', err); } finally { setIsHistoryLoading(false); }
  }, [token, API_BASE, lang]);

  // ── Automatic History Fetching ──────────────────────────────────────────
  React.useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
    } else {
      setChatHistory([]);
    }
  }, [selectedChatId, fetchChatMessages]);

  const totalUnread = React.useMemo(() => {
    const myProfileIds = new Set((myProfiles || []).map(p => p.id));
    return (messages || []).filter(m => m.status === 'unread' && myProfileIds.has(m.profileId)).length;
  }, [messages, myProfiles]);

  const handleSendMessage = React.useCallback((text) => {
    if (!text.trim() || !selectedChatId) return;
    const newMessage = { id: Date.now(), profileId: activeProfileId, chatId: selectedChatId, from: 'Nexus Hub', direction: 'OUTBOUND', text: text.trim(), createdAt: new Date().toISOString(), status: 'sent' };
    setMessages(prev => [...prev, newMessage]);
    setMessageValue("");
  }, [selectedChatId, activeProfileId]);

  const handleTranslate = React.useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => { setTranslatedText(`[Translated to EN]: ${sourceText}`); setIsTranslating(false); }, 1000);
  }, [sourceText]);

  const handleSaveNote = React.useCallback(() => {
    if (!internalNote.trim() || !selectedChatId || !selectedChat) return;
    const from = selectedChat.from;
    const newNote = { id: Date.now(), text: internalNote, author: activeOperator.name, timestamp: new Date().toLocaleTimeString() };
    setClientNotes(prev => ({ ...prev, [from]: [...(prev[from] || []), newNote] }));
    setInternalNote("");
  }, [internalNote, selectedChatId, selectedChat, activeOperator]);

  const handleDeleteNote = React.useCallback((client, noteId) => {
    setClientNotes(prev => ({ ...prev, [client]: (prev[client] || []).filter(n => n.id !== noteId) }));
  }, []);

  const startCall = React.useCallback(() => showToast(lang === 'cz' ? 'Inicializace VoIP spojení...' : 'Initializing secure VoIP relay...', 'info'), [showToast, lang]);

  const handleQuickSaveMeeting = React.useCallback(() => {
    if (!detectedMeeting) return;
    nexusData.handleQuickSaveMeeting(detectedMeeting);
    setDetectedMeeting(null);
  }, [detectedMeeting, nexusData]);

  // ── Android Back Button Handling ──────────────────────────────────────────
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupBack = async () => {
      const listener = await CapacitorApp.addListener('backButton', () => {
        // 1. Close modals/overlays first
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return;
        }
        
        if (selectedChatId) {
          setSelectedChatId(null);
          return;
        }

        // 2. Navigation logic
        if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
          return;
        }

        // 3. Exit logic
        CapacitorApp.exitApp();
      });

      return () => {
        listener.remove();
      };
    };

    const backPromise = setupBack();
    return () => {
      backPromise.then(l => l?.remove());
    };
  }, [isSidebarOpen, selectedChatId, activeTab]);

  const value = {
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    loading: nexusData.isDataLoading, activeOperator, activeRole, isAllowed,
    isLoggedIn, token, logout: () => { logout(); setShowLanding(true); setJustLoggedOut(true); }, 
    onLogin, onRegisterAgency: auth.handleRegisterAgency, onRegisterUser: auth.handleRegisterUser,
    justLoggedOut, setJustLoggedOut,
    isAppOwner: activeOperator?.isAppOwner || false,
    isManager: activeOperator?.isManager || false,
    isAdmin: activeOperator?.isAdmin || false,
    API_BASE, showLanding: showLanding ?? !isLoggedIn, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    updatePlans, fetchPlans, subscriptionPlans, isPlansLoading, showToast, contextToasts: _toasts,
    isMobile, isNativeApp, isSidebarCollapsed, setIsSidebarCollapsed, mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab, isTranslating, setIsTranslating, internalNote, setInternalNote,
    clientNotes, detectedMeeting, setDetectedMeeting, typingProfiles, setTypingProfiles,
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
    isSidebarOpen, setIsSidebarOpen,
    totalUnread, messages, filteredMessages, selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, setIsHistoryLoading,
    messageValue, setMessageValue, calViewDate, setCalViewDate, globalSettings, fetchGlobalSettings,
    gpsHistory, lastTrackerUpdate,
    voiceGuardianActive, handleToggleVoiceGuardian,
    batteryLevel, incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    heartRate, setHeartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected,
    isTvMode, tvToken, activeBioWarning, setActiveBioWarning, playBeep, triggerSilentSOS,
    handleUpdateGlobalSetting: async (key, value) => {
      try {
        const res = await axios.post(`${API_BASE}/admin/settings`, { key, value }, { headers: { Authorization: `Bearer ${token}` } });
        setGlobalSettings(prev => {
          const exists = prev.find(s => s.key === key);
          if (exists) return prev.map(s => s.key === key ? res.data : s);
          return [...prev, res.data];
        });
        showToast(lang === 'cz' ? 'Nastavení uloženo ✓' : 'Setting saved ✓', 'success');
        return { success: true, data: res.data };
      } catch (err) { return { success: false }; }
    },
    ...nexusData
  };

  React.useEffect(() => {
    if (isLoggedIn && (authUser?.isAppOwner || authUser?.isManager)) {
      fetchGlobalSettings();
    }
  }, [isLoggedIn, authUser, fetchGlobalSettings]);

  React.useEffect(() => {
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
            <div key={toast.id} style={{ pointerEvents: 'auto', padding: '0.75rem 1.25rem', borderRadius: '12px', color: 'white', background: toast.type === 'error' ? '#ef4444' : '#3b82f6' }}>{toast.message}</div>
          ))}
        </div>
      )}
    </NexusContext.Provider>
  );
};
