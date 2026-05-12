import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { NexusContext } from './ContextObject';
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
import { 
  CommunicationService,
  WhatsAppAdapter,
  SMSAdapter,
  WebChatAdapter,
  AgencyDataGateway,
  AnalyticsService,
  ContentSyncService
} from '../services';
import { normalizeRole } from '../utils/roleUtils';

// Shared AudioContext to prevent exhaustion on mobile devices
let sharedAudioCtx = null;
const _getSharedAudioCtx = () => {
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
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/en')) return 'en';
      if (path.startsWith('/cz')) return 'cz';
    }
    return getSafeStorage('nexus_lang', 'cz');
  });
  const [activeMarket, setActiveMarket] = useState(() => getSafeStorage('nexus_active_market', 'UK'));
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.substring(1);
      if (path && path !== '' && path !== 'dashboard' && path !== 'login' && path !== 'register') return path;
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
  
  // --- 2.1 ROUTING STATE ---
  const [pathname, setPathname] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path, authTab = 'login') => {
    if (typeof window === 'undefined') return;
    
    // If navigating to login/guide/etc, set the auth tab if provided
    if (authTab) setAuthInitialTab(authTab);

    // Ensure language prefix is preserved if not already there
    let targetPath = path;
    if (lang !== 'cz' && !path.startsWith(`/${lang}`)) {
      targetPath = `/${lang}${path === '/' ? '' : path}`;
    }
    
    window.history.pushState(null, '', targetPath);
    setPathname(targetPath);
  }, [lang]);

  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      // Strip language prefix for logic
      const cleanPath = path.replace(/^\/(en|cz)/, '') || '/';
      return cleanPath === '/' || cleanPath === '/guide';
    }
    return true;
  });

  // Sync showLanding and activeTab with pathname
  useEffect(() => {
    const p = pathname.replace(/^\/(en|cz)/, '') || '/';
    if (p === '/' || p === '/guide') {
      setShowLanding(true);
      if (p === '/guide') setActiveTab('guide');
    } else {
      setShowLanding(false);
      const tab = p.substring(1);
      if (tab === 'register') {
        setAuthInitialTab('register-agency');
      } else if (tab === 'login') {
        setAuthInitialTab('login');
      }
      
      if (tab && tab !== 'login' && tab !== 'register' && tab !== 'dashboard') {
        setActiveTab(tab);
      }
    }
    
    // Also sync lang from pathname if changed via manual URL entry
    if (pathname.startsWith('/en')) setLang('en');
    else if (pathname.startsWith('/cz')) setLang('cz');
  }, [pathname]);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => localStorage.getItem('nexus_hasSeenOnboarding') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');

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
  const [batteryLevel, _setBatteryLevel] = useState(null);
  const [heartRate, setHeartRate] = useState(null);
  const [hrThreshold, setHrThreshold] = useState(120);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [activeBioWarning, _setActiveBioWarning] = useState(null);
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
  const [subscriptionPlans, _setSubscriptionPlans] = useState([]);
  const [isPlansLoading, _setIsPlansLoading] = useState(false);
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
  const [openBookingMenuId, setOpenBookingMenuId] = useState(null);

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
          if (typeof text === 'string') {
            // Support both {key} and {{key}} formats
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
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
  
  const filteredCalendar = useMemo(() => {
    const raw = nexusData.calendar || [];
    if (!activeOperator) return [];
    if (activeOperator.isAppOwner || activeOperator.isAdmin || activeOperator.isManager || activeOperator.isSeniorOperator) return raw;
    const myProfileIds = new Set(myProfiles.map(p => p.id));
    return raw.filter(b => !b.profileId || myProfileIds.has(b.profileId));
  }, [nexusData.calendar, activeOperator, myProfiles]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    
    // Get IDs of profiles this user is allowed to see
    const allowedProfileIds = new Set(myProfiles.map(p => p.id));
    
    // Filter messages to only those belonging to allowed profiles
    const allowedMessages = messages.filter(m => allowedProfileIds.has(m.profileId));

    if (activeProfileId === 'all') return allowedMessages;
    return allowedMessages.filter(m => m.profileId === activeProfileId);
  }, [messages, activeProfileId, myProfiles]);

  const selectedChat = useMemo(() => 
    (messages || []).find(m => m.id === selectedChatId) || null, 
    [messages, selectedChatId]
  );

  const chatMessages = useMemo(() => {
    if (!selectedChat) return [];
    
    // Combine messages from both sources
    const allMsgs = [
      ...(selectedChat.messages || []),
      ...(Array.isArray(chatHistory) ? chatHistory : [])
    ];

    // Deduplicate by ID and sort
    const seenIds = new Set();
    const uniqueMsgs = [];

    for (const m of allMsgs) {
      if (!m) continue;
      const id = m.id || `${m.timestamp}-${m.text}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueMsgs.push(m);
      }
    }

    return uniqueMsgs.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || a.time);
      const timeB = new Date(b.createdAt || b.timestamp || b.time);
      return timeA - timeB;
    });
  }, [selectedChat, chatHistory]);

  // --- 11. SHARED CALLBACKS & ACTIONS ---
  const logoutStable = useCallback(() => logout(), [logout]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!chatId || !token) return;
    setIsHistoryLoading(true);
    // Note: We don't clear chatHistory immediately to avoid flicker 
    // since we now have deduplication in useMemo
    try {
      const res = await axios.get(`${API_BASE}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        // Handle various common API response formats
        let data = [];
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res.data.data)) {
          data = res.data.data;
        } else if (Array.isArray(res.data.messages)) {
          data = res.data.messages;
        }
        setChatHistory(data);
      }
    } catch (err) {
      console.error('[NexusContext] Failed to fetch chat history:', err);
      // Optional: showToast('Failed to load history', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, API_BASE]);

  // Automatically fetch history when a chat is selected
  useEffect(() => {
    if (selectedChatId) {
      isUserScrolled.current = false; // Reset scroll state for new chat
      fetchChatMessages(selectedChatId);
    } else {
      setChatHistory([]);
    }
  }, [selectedChatId, fetchChatMessages]);

  // Handle automatic scrolling to bottom
  useEffect(() => {
    if (!chatScrollRef.current || chatMessages.length === 0) return;

    const scrollToBottom = () => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    };

    // If history just finished loading, always scroll to bottom
    // OR if user is already at the bottom and a new message arrives
    if (!isHistoryLoading && !isUserScrolled.current) {
      // Small timeout to ensure DOM has updated with new messages
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, isHistoryLoading]);

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
      showToast(t('sosActivated'), 'error');
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
      showToast(t('sosResolved'), 'success');
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
      showToast(t('departureConfirmed'), 'success');
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
      const res = await axios.post(`${API_BASE}/ai/translate`, { text, target }, {
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
      ? t('voiceGuardianActivated') 
      : t('voiceGuardianDeactivated'), 'info');
  }, [voiceGuardianActive, lang, showToast]);

  const startCheckinTimer = useCallback((mins) => {
    setCheckinMinutes(mins);
    setCheckinTimerEnd(Date.now() + mins * 60000);
    showToast(t('checkInTimerSet', { mins }), 'info');
  }, [lang, showToast]);

  const resetCheckinTimer = useCallback(() => {
    if (!checkinTimerEnd) return;
    setCheckinTimerEnd(Date.now() + checkinMinutes * 60000);
    showToast(t('checkInTimerReset'), 'success');
  }, [checkinMinutes, checkinTimerEnd, lang, showToast]);

  const triggerGhostCall = useCallback(() => {
    setIncomingGhostCall(true);
    setGhostCallScheduledAt(null);
  }, []);

  const verifyIdentity = useCallback(() => {
    showToast(t('identityVerified'), 'success');
  }, [lang, showToast]);

  const handleDeleteAgency = useCallback(async (agencyId) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/admin/agencies/${agencyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(t('agencyDeleted'), 'success');
      nexusData.initData();
    } catch (_err) { console.error(_err); }
  }, [token, lang, showToast, nexusData, API_BASE]);

  const handleImpersonateAgency = useCallback(async (agency) => {
    showToast(t('impersonatingAgency', { name: agency.name }), 'info');
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
      showToast(t('rewardConfirmed'), 'success');
      return { success: true };
    } catch { return { success: false }; }
  }, [token, lang, showToast, API_BASE]);

  const handleRelayCommand = useCallback(async (data) => {
    if (!data) return;
    const isCommand = data.type === 'send_sms' || data.targetType === 'relay_command' || !!data.messageId;
    if (!isCommand) return;
    showToast(t('smsRelayCommandReceived'), 'info');
    if (!isRelayActive) {
      showToast(t('relayInactive'), 'warning');
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
        showToast(t('smsSentTo', { to }), 'success');
        if (messageId) {
          await axios.patch(`${API_BASE}/messages/${messageId}/status`, { status: 'sent', result: JSON.stringify(result) }, { headers: { Authorization: `Bearer ${token}` } });
          updateRelayLogStatus(logId, 'forwarded');
        }
      } else showToast(t('relayPluginUnavailable'), 'error');
    } catch (_err) {
      updateRelayLogStatus(logId, 'failed');
      showToast(t('smsFailed', { error: _err.message }), 'error');
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
      showToast(t('browserNoVoiceSupport'), 'error');
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
        showToast(t('micAccessDenied'), 'error');
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
    () => showToast(t('emergencyAlert'), 'error'), 
    () => {}, 
    handleRelayCommand, 
    (d) => d?.type === 'SYNC_COMPLETED' && showToast(t('syncCompleted'), 'success')
  );

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    initPushNotifications(API_BASE, token, async (n, tapped) => {
      const d = n?.data;
      if (tapped && d?.chatId) { setSelectedChatId(d.chatId); setActiveTab('inbox'); }
      if (d?.type === 'safety_alert') showToast(t('emergencyAlert'), 'error');
      if (d) handleRelayCommand(d);
    });
    return () => { removePushListeners(); };
  }, [isLoggedIn, token, API_BASE, handleRelayCommand, showToast, lang]);

  useEffect(() => {
    localStorage.setItem('nexus_lang', lang);
    localStorage.setItem('nexus_active_tab', activeTab);
    localStorage.setItem('nexus_active_market', activeMarket);
    if (activeProfileId) localStorage.setItem('nexus_active_profile_id', activeProfileId);
    
    // Sync activeTab with URL for better refresh persistence
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      let targetPath = '/';
      
      if (activeTab === 'guide' && showLanding) {
        targetPath = '/guide';
      } else if (!showLanding) {
        targetPath = isLoggedIn ? `/${activeTab}` : '/login';
      }

      // Add language prefix if not Czech
      if (lang !== 'cz') {
        targetPath = `/${lang}${targetPath === '/' ? '' : targetPath}`;
      }
      
      if (currentPath !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [lang, activeTab, activeMarket, activeProfileId, showLanding, isLoggedIn]);

  useEffect(() => {
    const key = activeOperator?.id ? `nexus_sidebar_collapsed_${activeOperator.id}` : 'nexus_sidebar_collapsed_guest';
    localStorage.setItem(key, String(isSidebarCollapsed));
  }, [isSidebarCollapsed, activeOperator?.id]);

  // --- 13. ROUTING GUARD & PERMISSION ENFORCEMENT ---
  useEffect(() => {
    if (nexusData.isDataLoading) return; // Wait for initial hydration
    
    const infraTabs = ['agencies', 'infra', 'infrastructure', 'features', 'plans', 'plans-owner', 'permissions', 'maintenance', 'docs'];
    if (!activeOperator?.isAppOwner && infraTabs.includes(activeTab)) {
      console.warn(`[Nexus-Guard] Unauthorized access to ${activeTab} prevented for role: ${activeOperator?.role}`);
      setActiveTab('dashboard');
    }
  }, [activeTab, activeOperator, nexusData.isDataLoading]);

  const filteredStats = useMemo(() => {
    const raw = nexusData.stats || {};
    if (!activeOperator) return raw;
    if (activeOperator.isAppOwner || activeOperator.isAdmin || activeOperator.isManager || activeOperator.isSeniorOperator) return raw;
    
    return {
      ...raw,
      revenue: (lang === 'cz' || lang === 'cs') ? '0 Kč' : '£0.00',
      revenueMtd: (lang === 'cz' || lang === 'cs') ? '0 Kč' : '£0.00',
      totalBookings: filteredCalendar.length,
      activeBookings: filteredCalendar.length,
      totalMessages: filteredMessages.length,
      totalCalls: 0,
      chartData: Array.isArray(raw.chartData) ? raw.chartData.map(() => 0) : [],
      sparklineData: Array.isArray(raw.sparklineData) ? raw.sparklineData.map(() => 0) : []
    };
  }, [nexusData.stats, activeOperator, filteredCalendar, filteredMessages, lang]);

  // --- 13. OMNICHANNEL & ARCHITECTURE SERVICES ---
  const omnichannelConfig = useMemo(() => ({
    API_BASE,
    token,
    whatsapp: { apiKey: localStorage.getItem('nexus_whatsapp_key') || '' },
    sms: { gateway: 'relay' },
    webchat: { endpoint: '/chat' }
  }), [API_BASE, token]);

  const commService = useMemo(() => {
    try {
      const service = new CommunicationService(omnichannelConfig);
      service.registerAdapter('whatsapp', new WhatsAppAdapter(omnichannelConfig.whatsapp));
      service.registerAdapter('sms', new SMSAdapter(omnichannelConfig.sms));
      service.registerAdapter('webchat', new WebChatAdapter(omnichannelConfig.webchat));
      return service;
    } catch (err) {
      console.error('[NexusContext] Failed to init CommunicationService:', err);
      return null;
    }
  }, [omnichannelConfig]);

  const agencyGateway = useMemo(() => new AgencyDataGateway({ token, API_BASE }), [token, API_BASE]);
  const analyticsService = useMemo(() => new AnalyticsService({ token, API_BASE }), [token, API_BASE]);
  const syncService = useMemo(() => new ContentSyncService({ token, API_BASE }), [token, API_BASE]);

  // --- 14. CONTEXT VALUE ---
  const value = useMemo(() => ({
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    pathname, navigate, authInitialTab, setAuthInitialTab,
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
    handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote: (_client, _id) => {}, 
    startCall: () => showToast(t('voipInitializing'), 'info'), 
    handleQuickSaveMeeting: nexusData.handleQuickSaveMeeting,
    activeProfile, activeProfileId, setActiveProfileId, profiles, myProfiles, onlineOnly, setOnlineOnly, 
    agencies: nexusData.agencies, stats: filteredStats, operators: nexusData.operators, setProfiles: nexusData.setProfiles,
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
    calendar: filteredCalendar, bookingSchedule: filteredCalendar,
    isBookingModalOpen: nexusData.isBookingModalOpen, setIsBookingModalOpen: nexusData.setIsBookingModalOpen,
    newBookingForm: nexusData.newBookingForm, setNewBookingForm: nexusData.setNewBookingForm,
    handleSaveBooking: nexusData.handleSaveBooking,
    isSidebarOpen, setIsSidebarOpen, totalUnread: (messages || []).length, messages, filteredMessages, selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, setIsHistoryLoading,
    isRelayActive, setIsRelayActive: setRelayActiveStable, 
    relaySimSlot, setRelaySimSlot, relayLogs, setRelayLogs, addRelayLog, updateRelayLogStatus,
    linkedTrackerId, setLinkedTrackerId, trackerStatus, setTrackerStatus,
    messageValue, setMessageValue, calViewDate, setCalViewDate, 
    openBookingMenuId, setOpenBookingMenuId,
    _gpsHistory, lastTrackerUpdate, voiceGuardianActive, handleToggleVoiceGuardian,
    batteryLevel, incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    isTvMode, setIsTvMode,
    heartRate, setHeartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected, activeBioWarning,
    commService, agencyGateway, analyticsService, syncService
  }), [
    t, lang, activeTab, activeMarket, pathname, navigate, authInitialTab, nexusData.isDataLoading, activeOperator, activeRole, isAllowed, isLoggedIn, token,
    logoutStable, handleLogin, auth.handleRegisterAgency, auth.handleRegisterUser,
    showLanding, hasSeenOnboarding, showOnboarding, isMobile, isNativeApp, isSidebarCollapsed, mobileView,
    inlinePanelTab, sourceText, translatedText, isTranslating, internalNote, clientNotes, detectedMeeting, typingProfiles,
    activeContextTab, translateTargetLang, showPanicConfirm, incomingRelayCall,
    activeSafetySession, sosActive, linkedSessionId, checkinMinutes, checkinTimerEnd, checkinRemaining,
    pendingNotifications, nexusData.onDelayBooking, agencyDetailModalData, isAddAgencyOpen,
    isBugReportOpen, isAddUserOpen, addUserModalAgencyId, isEditProfileOpen, editingProfileData,
    handleSendMessage, handleTranslate, handleSaveNote, nexusData.handleQuickSaveMeeting,
    activeProfile, activeProfileId, profiles, myProfiles, onlineOnly, 
    nexusData.agencies, filteredStats, nexusData.operators, nexusData.setProfiles,
    nexusData.toggleOperatorStatus, nexusData.handleSaveAssignees,
    handleDeleteAgency, handleImpersonateAgency, fetchAllReferrals, handleConfirmReferral,
    nexusData.isSyncing, nexusData.syncStatus, nexusData.syncProgress,
    nexusData.relayOnline, nexusData.handleSyncAll, nexusData.handleSyncChatHistory,
    nexusData.handleSaveBio, nexusData.handleSaveCredentials,
    nexusData.bioText, nexusData.globalFeatures, nexusData.handleFeatureToggle,
    nexusData.globalSettings, nexusData.handleUpdateGlobalSetting,
    nexusData.isTraining, nexusData.trainingProgress,
    nexusData.onStartTraining, nexusData.onResetTraining,
    filteredCalendar,
    commService, agencyGateway, analyticsService, syncService,
    messages, selectedChatId, selectedChat, chatMessages, chatHistory, fetchChatMessages, isHistoryLoading, isRelayActive, setRelayActiveStable, relaySimSlot, relayLogs, addRelayLog, updateRelayLogStatus, linkedTrackerId, trackerStatus, calViewDate, _gpsHistory, lastTrackerUpdate, voiceGuardianActive, handleToggleVoiceGuardian, batteryLevel, incomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity, _toasts, subscriptionPlans, isPlansLoading, isSidebarOpen, isTvMode, heartRate, hrThreshold, isBluetoothConnected, activeBioWarning, messageValue, showToast, openBookingMenuId
  ]);

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
};
