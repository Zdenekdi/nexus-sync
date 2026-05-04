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
  const [lang, setLang] = useState(() => getSafeStorage('nexus_lang', 'en'));
  const [activeMarket, setActiveMarket] = useState(() => getSafeStorage('nexus_active_market', 'UK'));
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.substring(1);
      if (path && path !== '' && path !== 'dashboard') return path;
    }
    return localStorage.getItem('nexus_active_tab') || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nexus_activeOperator');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const userId = user?.id || user?._id || user?.userId;
      const key = userId ? `nexus_sidebar_collapsed_${userId}` : 'nexus_sidebar_collapsed_guest';
      return localStorage.getItem(key) === 'true';
    } catch (_err) {
      return localStorage.getItem('nexus_sidebar_collapsed_guest') === 'true';
    }
  });
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [isTvMode, setIsTvMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('tv') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. AUTHENTICATION & IDENTITY ---
  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('nexus_active_profile_id') || 'all');
  const [showLanding, setShowLanding] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => localStorage.getItem('nexus_hasSeenOnboarding') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- 3. DATA & MESSAGING STATES ---
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [relaySimSlot, setRelaySimSlot] = useState(() => localStorage.getItem('nexus_relay_sim_slot') || 'auto');
  const [relayLogs, setRelayLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_relay_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isRelayActive, setIsRelayActive] = useState(() => localStorage.getItem('nexus_relay_active') === 'true');

  // --- 4. SAFETY & MONITORING STATES ---
  const [sosActive, setSosActive] = useState(false);
  const [sosAlertId, setSosAlertId] = useState(null);
  const [checkinMinutes, setCheckinMinutes] = useState(30);
  const [checkinTimerEnd, setCheckinTimerEnd] = useState(null);
  const [checkinRemaining, setCheckinRemaining] = useState(null);
  const [linkedSessionId, setLinkedSessionId] = useState(null);
  const [voiceGuardianActive, setVoiceGuardianActive] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [heartRate, setHeartRate] = useState(null);
  const [hrThreshold, setHrThreshold] = useState(120);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [activeBioWarning, setActiveBioWarning] = useState(null);
  const [activeSafetySession, _setActiveSafetySession] = useState(null);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  // --- 5. UI MODALS & OTHER STATES ---
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);
  const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [agencyDetailModalData, setAgencyDetailModalData] = useState(null);
  const [addUserModalAgencyId, setAddUserModalAgencyId] = useState(null);
  const [_toasts, _setToasts] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [pinModalPromise, setPinModalPromise] = useState(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState({});
  const [incomingRelayCall, setIncomingRelayCall] = useState(null);
  const [incomingGhostCall, setIncomingGhostCall] = useState(false);
  const [ghostCallScheduledAt, setGhostCallScheduledAt] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [activeContextTab, setActiveContextTab] = useState('history');
  const [inlinePanelTab, setInlinePanelTab] = useState('notes');
  const [translateTargetLang, setTranslateTargetLang] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [typingProfiles, setTypingProfiles] = useState({});
  const [detectedMeeting, setDetectedMeeting] = useState(null);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [linkedTrackerId, setLinkedTrackerId] = useState(null);
  const [trackerStatus, setTrackerStatus] = useState('offline');
  const [_gpsHistory, setGpsHistory] = useState([]);
  const [lastTrackerUpdate, setLastTrackerUpdate] = useState(null);
  const [calViewDate, setCalViewDate] = useState(new Date());

  // --- 6. REFS ---
  const checkinIntervalRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);
  const lastRelayConfigRef = useRef(null);

  // --- 7. CORE MEMOIZED HELPERS ---
  const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);

  const t = useCallback((key, params = {}) => {
    try {
      if (!key || typeof key !== 'string') return key || '';
      const safeTranslations = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS) || {};
      const langSet = safeTranslations[lang] || safeTranslations['en'] || {};
      
      let text = key.split('.').reduce((obj, k) => (obj && obj[k]) ? obj[k] : null, langSet) || key;

      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          if (typeof text === 'string' && text.includes(`{{${k}}}`)) {
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

  const setRelayActiveStable = useCallback((val) => {
    setIsRelayActive(val);
    localStorage.setItem('nexus_relay_active', String(val));
  }, []);

  // --- 8. AUTHENTICATION ---
  const auth = useAuth({ 
    API_BASE,
    _t: t,
    setIsRelayMode: setRelayActiveStable, 
    setSelectedChatId, 
    setActiveProfileId, 
    setShowLanding 
  });
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn, handleLogin } = auth;

  // --- 9. DATA FETCHING & SYNC ---
  const memoizedSetActiveOperator = useCallback((op) => setActiveOperatorState(op), []);
  const memoizedSetMessages = useCallback((msgs) => setMessages(msgs), []);
  const memoizedSetActiveSafetySession = useCallback((sess) => _setActiveSafetySession(sess), []);
  const memoizedSetTimeLeft = useCallback((time) => setCheckinRemaining(time), []);

  const nexusData = useNexusData({
    token, isLoggedIn, API_BASE, activeProfileId,
    setActiveOperator: memoizedSetActiveOperator,
    normalizeProfileId: (id) => id,
    setMessages: memoizedSetMessages,
    setActiveSafetySession: memoizedSetActiveSafetySession,
    setIsTimerActive: () => {},
    setTimeLeft: memoizedSetTimeLeft,
    showToast, lang
  });

  // --- 10. PERMISSIONS & DERIVED STATE ---
  const activeOperator = useMemo(() => {
    const user = activeOperatorState || authUser;
    if (!user) return null;
    
    // Ensure normalization
    const roleName = normalizeRole(user.role || user.roleName || '');
    return {
      ...user,
      normalizedRole: roleName,
      isAppOwner: roleName === 'app_owner',
      isAdmin: roleName === 'agency_admin',
      isManager: roleName === 'manager',
      isSeniorOperator: roleName === 'senior_operator',
      isOperator: roleName === 'operator',
      isModel: roleName === 'model'
    };
  }, [activeOperatorState, authUser]);

  const { activeRole, isAllowed } = usePermissions(activeOperator, nexusData.rolePermissions);

  const profiles = nexusData.profiles || [];
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    if (activeOperator.isAppOwner || activeOperator.isAdmin || activeOperator.isManager || activeOperator.isSeniorOperator) return profiles;
    return profiles.filter(p => {
      if (p.id === activeOperator.profileId) return true;
      if (Array.isArray(activeOperator.assignedProfileIds) && activeOperator.assignedProfileIds.includes(p.id)) return true;
      return false;
    });
  }, [profiles, activeOperator]);

  const activeProfile = useMemo(() => 
    (profiles || []).find(p => p.id === activeProfileId) || myProfiles[0] || null, 
    [profiles, activeProfileId, myProfiles]
  );

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (activeProfileId === 'all') return messages;
    return messages.filter(m => m.profileId === activeProfileId);
  }, [messages, activeProfileId]);

  const selectedChat = useMemo(() => 
    (messages || []).find(m => m.id === selectedChatId) || null, 
    [messages, selectedChatId]
  );

  const chatMessages = useMemo(() => {
    if (!selectedChat) return [];
    return [
      ...(selectedChat.messages || []),
      ...chatHistory
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [selectedChat, chatHistory]);

  // --- 11. SHARED CALLBACKS & ACTIONS ---
  const logoutStable = useCallback(() => logout(), [logout]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!chatId || !token) return;
    setIsHistoryLoading(true);
    setChatHistory([]); // Clear old history while loading new one
    try {
      const res = await axios.get(`${API_BASE}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) setChatHistory(res.data);
    } catch (err) {
      console.error('[NexusContext] Failed to fetch chat history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, API_BASE]);

  // Automatically fetch history when a chat is selected
  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
    } else {
      setChatHistory([]);
    }
  }, [selectedChatId, fetchChatMessages]);

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
      showToast(lang === 'cz' ? '🆘 SOS AKTIVOVÁNO' : '🆘 SOS ACTIVATED', 'error');
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

  const handleConfirmDeparture = useCallback(async () => {
    if (!linkedSessionId) return;
    try {
      await axios.post(`${API_BASE}/safety/sessions/${linkedSessionId}/departure`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? 'Klient odešel, odjezd potvrzen.' : 'Client left, departure confirmed.', 'success');
    } catch (_err) { console.error(_err); }
  }, [linkedSessionId, token, showToast, lang, API_BASE]);

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

  const handleSendMessage = useCallback(async (content, overrides = {}) => {
    if (!selectedChatId || !token) return;
    try {
      const res = await axios.post(`${API_BASE}/messages`, {
        chatId: selectedChatId,
        content,
        ...overrides
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data) setMessages(prev => [...prev, res.data]);
    } catch (_err) { console.error(_err); }
  }, [selectedChatId, token]);

  const handleTranslate = useCallback(async (text, target) => {
    if (!text || !token) return;
    setIsTranslating(true);
    try {
      const res = await axios.post(`${API_BASE}/translate`, { text, target }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTranslatedText(res.data.translated);
    } catch (_err) { console.error(_err); }
    finally { setIsTranslating(false); }
  }, [token]);

  const handleSaveNote = useCallback(async (clientId, note) => {
    if (!clientId || !token) return;
    try {
      await axios.post(`${API_BASE}/clients/${clientId}/notes`, { note }, { headers: { Authorization: `Bearer ${token}` } });
      setClientNotes(prev => ({ ...prev, [clientId]: note }));
    } catch (_err) { console.error(_err); }
  }, [token]);

  const handleToggleVoiceGuardian = useCallback(() => {
    setVoiceGuardianActive(prev => !prev);
    showToast(!voiceGuardianActive 
      ? (lang === 'cz' ? 'Hlasový strážce aktivován' : 'Voice Guardian activated') 
      : (lang === 'cz' ? 'Hlasový strážce vypnut' : 'Voice Guardian deactivated'), 'info');
  }, [voiceGuardianActive, lang, showToast]);

  const startCheckinTimer = useCallback((mins) => {
    setCheckinMinutes(mins);
    setCheckinTimerEnd(Date.now() + mins * 60000);
    showToast(lang === 'cz' ? `Časovač nastaven na ${mins} min.` : `Check-in timer set to ${mins} min.`, 'info');
  }, [lang, showToast]);

  const resetCheckinTimer = useCallback(() => {
    if (!checkinTimerEnd) return;
    setCheckinTimerEnd(Date.now() + checkinMinutes * 60000);
    showToast(lang === 'cz' ? 'Časovač restartován.' : 'Check-in timer reset.', 'success');
  }, [checkinMinutes, checkinTimerEnd, lang, showToast]);

  const triggerGhostCall = useCallback(() => {
    setIncomingGhostCall(true);
    setGhostCallScheduledAt(null);
  }, []);

  const verifyIdentity = useCallback(() => {
    showToast(lang === 'cz' ? 'Identita ověřena (Simulace)' : 'Identity verified (Simulated)', 'success');
  }, [lang, showToast]);

  const handleDeleteAgency = useCallback(async (agencyId) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/admin/agencies/${agencyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? 'Agentura smazána.' : 'Agency deleted.', 'success');
      nexusData.initData();
    } catch (_err) { console.error(_err); }
  }, [token, lang, showToast, nexusData, API_BASE]);

  const handleImpersonateAgency = useCallback(async (agency) => {
    showToast(lang === 'cz' ? `Impersonace ${agency.name} (Simulace)` : `Impersonating ${agency.name} (Simulated)`, 'info');
  }, [lang, showToast]);

  const fetchAllReferrals = useCallback(async () => {
    if (!token) return [];
    try {
      const res = await axios.get(`${API_BASE}/admin/referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch { return []; }
  }, [token, API_BASE]);

  const handleConfirmReferral = useCallback(async (refId, amount) => {
    if (!token) return { success: false };
    try {
      await axios.post(`${API_BASE}/admin/referrals/${refId}/confirm`, { amount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(lang === 'cz' ? 'Reward potvrzen.' : 'Reward confirmed.', 'success');
      return { success: true };
    } catch { return { success: false }; }
  }, [token, lang, showToast, API_BASE]);

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

  const syncRelayToNative = useCallback(async (active) => {
    if (Capacitor.isNativePlatform() && window.Capacitor?.Plugins?.NexusRelay) {
      try {
        const config = {
          isActive: active,
          apiUrl: API_BASE,
          token: token,
          operatorId: activeOperator?.id,
          profileId: activeOperator?.profileId || activeOperator?.activeProfileId || activeProfileId,
          simSlot: relaySimSlot === 'auto' ? null : parseInt(relaySimSlot)
        };
        const configStr = JSON.stringify(config);
        if (lastRelayConfigRef.current === configStr) return;
        lastRelayConfigRef.current = configStr;
        await window.Capacitor.Plugins.NexusRelay.updateConfig(config);
        console.log('[Relay] Native config updated', active);
      } catch (_err) { console.error('[Relay] Sync to native failed', _err); }
    }
  }, [token, activeOperator, activeProfileId, relaySimSlot, API_BASE]);

  // --- 12. EFFECTS ---
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
    if (isLoggedIn) {
      syncRelayToNative(isRelayActive); 
    }
  }, [isLoggedIn, isRelayActive, syncRelayToNative]);

  useSocket(token, 
    (d) => d?.message && setMessages(p => [...p.slice(-199), d.message]), 
    (d) => d?.message && setMessages(p => p.map(m => m.id === d.message.id ? { ...m, ...d.message } : m)), 
    (d) => setIncomingRelayCall(d), 
    () => showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error'), 
    () => {}, 
    handleRelayCommand, 
    (d) => d?.type === 'SYNC_COMPLETED' && showToast(lang === 'cz' ? '✅ Synchronizace dokončena' : '✅ Sync completed', 'success')
  );

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    initPushNotifications(API_BASE, token, async (n, tapped) => {
      const d = n?.data;
      if (tapped && d?.chatId) { setSelectedChatId(d.chatId); setActiveTab('inbox'); }
      if (d?.type === 'safety_alert') showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
      if (d) handleRelayCommand(d);
    });
    return () => { removePushListeners(); };
  }, [isLoggedIn, token, API_BASE, handleRelayCommand, showToast, lang]);

  useEffect(() => {
    localStorage.setItem('nexus_lang', lang);
    localStorage.setItem('nexus_active_tab', activeTab);
    localStorage.setItem('nexus_active_market', activeMarket);
    if (activeProfileId) localStorage.setItem('nexus_active_profile_id', activeProfileId);
  }, [lang, activeTab, activeMarket, activeProfileId]);

  useEffect(() => {
    const key = activeOperator?.id ? `nexus_sidebar_collapsed_${activeOperator.id}` : 'nexus_sidebar_collapsed_guest';
    localStorage.setItem(key, String(isSidebarCollapsed));
  }, [isSidebarCollapsed, activeOperator?.id]);

  // --- 13. CONTEXT VALUE ---
  const value = useMemo(() => ({
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    loading: nexusData.isDataLoading, activeOperator, activeRole, isAllowed, isLoggedIn, token,
    logout: logoutStable, onLogin: handleLogin, onRegisterAgency: auth.handleRegisterAgency, onRegisterUser: auth.handleRegisterUser,
    isAppOwner: activeOperator?.isAppOwner || false, isManager: activeOperator?.isManager || false, isAdmin: activeOperator?.isAdmin || false,
    API_BASE, showLanding: showLanding ?? !isLoggedIn, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    isMobile, isNativeApp, isSidebarCollapsed, setIsSidebarCollapsed, mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab, sourceText, setSourceText, translatedText, setTranslatedText, isTranslating, setIsTranslating,
    internalNote, setInternalNote, clientNotes, detectedMeeting, setDetectedMeeting, typingProfiles, setTypingProfiles,
    activeContextTab, setActiveContextTab, translateTargetLang, setTranslateTargetLang,
    showPanicConfirm, setShowPanicConfirm, chatScrollRef, isUserScrolled, incomingRelayCall, setIncomingRelayCall,
    activeSafetySession, sosActive, linkedSessionId, checkinMinutes, setCheckinMinutes,
    checkinTimerEnd, checkinRemaining, triggerSOS, cancelSOS, startCheckinTimer, resetCheckinTimer, confirmDeparture: handleConfirmDeparture,
    pendingNotifications, setPendingNotifications, onDelayBooking: nexusData.onDelayBooking,
    agencyDetailModalData, setAgencyDetailModalData, isAddAgencyOpen, setIsAddAgencyOpen,
    isBugReportOpen, setIsBugReportOpen, isAddUserOpen, setIsAddUserOpen, addUserModalAgencyId, setAddUserModalAgencyId,
    SAFETY_SUGGESTIONS: ['15m', '30m', '45m', '60m', '1.5h', '2h'],
    handleAddAgency: () => setIsAddAgencyOpen(true),
    handleAgencyDetail: (agency) => setAgencyDetailModalData(agency),
    handleEditProfile: (profile) => { setEditingProfileData(profile); setIsEditProfileOpen(true); },
    isEditProfileOpen, setIsEditProfileOpen, editingProfileData, setEditingProfileData,
    handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote: (client, id) => {}, 
    startCall: () => showToast(lang === 'cz' ? 'Inicializace VoIP...' : 'Initializing VoIP...', 'info'), 
    handleQuickSaveMeeting: nexusData.handleQuickSaveMeeting,
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
    isTvMode, setIsTvMode,
    heartRate, setHeartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected, activeBioWarning
  }), [
    t, lang, activeTab, activeMarket, nexusData, activeOperator, activeRole, isAllowed, isLoggedIn, token, logoutStable, auth, showLanding, hasSeenOnboarding, showOnboarding, isMobile, isNativeApp, isSidebarCollapsed, mobileView, inlinePanelTab, sourceText, translatedText, isTranslating, internalNote, clientNotes, detectedMeeting, typingProfiles, activeContextTab, translateTargetLang, showPanicConfirm, activeSafetySession, sosActive, linkedSessionId, checkinMinutes, checkinTimerEnd, checkinRemaining, triggerSOS, cancelSOS, startCheckinTimer, resetCheckinTimer, handleConfirmDeparture, pendingNotifications, agencyDetailModalData, isAddAgencyOpen, isBugReportOpen, isAddUserOpen, addUserModalAgencyId, isEditProfileOpen, editingProfileData, profiles, myProfiles, activeProfile, activeProfileId, onlineOnly, messages, filteredMessages, selectedChatId, selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, isRelayActive, setRelayActiveStable, relaySimSlot, relayLogs, addRelayLog, updateRelayLogStatus, linkedTrackerId, trackerStatus, calViewDate, _gpsHistory, lastTrackerUpdate, voiceGuardianActive, handleToggleVoiceGuardian, batteryLevel, incomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity, _toasts, subscriptionPlans, isPlansLoading, isSidebarOpen, isTvMode, heartRate, hrThreshold, isBluetoothConnected, activeBioWarning, handleSendMessage, handleTranslate, handleSaveNote, handleDeleteAgency, handleImpersonateAgency, fetchAllReferrals, handleConfirmReferral, messageValue
  ]);

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
};
