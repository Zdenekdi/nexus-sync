import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
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
import { NexusContext } from './NexusBaseContext';

export { useNexus } from './NexusBaseContext';

export const NexusProvider = ({ children }) => {
  // 1. Core UI States
  const [lang, setLang] = useState(localStorage.getItem('nexus_lang') || 'cz');
  
  // Translation helper - needed for useAuth
  const t = useCallback((key) => TRANSLATIONS[lang]?.[key] || key, [lang]);

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
  const [activeProfileId, setActiveProfileId] = useState(localStorage.getItem('nexus_active_profile_id') || null);
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/login') return false;
      return localStorage.getItem('nexus_isLoggedIn') !== 'true';
    }
    return true;
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'chat', 'details'
  const [inlinePanelTab, setInlinePanelTab] = useState(null);
  const [activeContextTab, setActiveContextTab] = useState('translator');
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [detectedMeeting, setDetectedMeeting] = useState(null);
  const [typingProfiles, setTypingProfiles] = useState({});
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  
  // Modals state
  const [agencyDetailModalData, setAgencyDetailModalData] = useState(null);
  const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserModalAgencyId, setAddUserModalAgencyId] = useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);

  // 2. Authentication Hook (now initialized after required UI states)
  const auth = useAuth({ 
    API_BASE,
    t,
    setIsRelayMode: () => {}, 
    setSelectedChatId: () => {}, 
    setActiveProfileId, 
    setShowLanding 
  });
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn } = auth;

  // 3. Other Core Components Logic
  const chatScrollRef = React.useRef(null);
  const isUserScrolled = React.useRef(false);
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState("");
  const [clientNotes, setClientNotes] = useState({});
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [_toasts, _setToasts] = useState([]);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);

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
    } catch (e) {
      console.warn('[App] Back button listener setup failed:', e);
    }
    return () => { listener?.remove?.(); };
  }, [isNativeApp]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    _setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([
    { id: 'basic', name: 'Basic', descriptionKey: 'basicDesc', prices: { cz: '2900', eu: '120', us: '130', uk: '110' }, profilesLimit: 5, features: ['feat_profiles', 'feat_analytics_basic', 'feat_support'] },
    { id: 'pro', name: 'Pro', descriptionKey: 'proDesc', prices: { cz: '5900', eu: '240', us: '260', uk: '220' }, profilesLimit: 10, features: ['feat_all_basic', 'feat_analytics_adv', 'feat_ai_opt'] },
    { id: 'agency', name: 'Agency', descriptionKey: 'agencyDesc', prices: { cz: '9900', eu: '400', us: '440', uk: '360' }, profilesLimit: 20, features: ['feat_all_pro', 'feat_audit_logs', 'feat_api_access'] }
  ]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [globalSettings, setGlobalSettings] = useState([]);

  const fetchGlobalSettings = useCallback(async () => {
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

  useEffect(() => {
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
  }, [logout, auth]);

  const nexusData = useNexusData({
    token,
    isLoggedIn,
    API_BASE,
    activeProfileId,
    setActiveOperator: (op) => setActiveOperatorState(op),
    normalizeProfileId: (id) => id, 
    setMessages,
    setActiveSafetySession: () => {},
    setIsTimerActive: () => {},
    setTimeLeft: () => {},
    showToast,
    lang
  });

  const activeOperator = useMemo(() => {
    const base = authUser || {};
    const update = activeOperatorState || {};
    const combined = { ...base, ...update };
    if (!combined.id && !combined._id && !combined.userId && !isLoggedIn) return null;
    
    const rawRole = (combined.role?.name || combined.role || '').toUpperCase();
    const name = combined.fullname || combined.name || combined.username || (combined.email ? combined.email.split('@')[0] : '');
    
    return {
      ...combined,
      id: combined.id || combined._id || combined.userId,
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

  const [incomingRelayCall, setIncomingRelayCall] = useState(null);
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
  const handleSipIncomingCall = useCallback((_data) => {}, []);

  useSocket(token, handleNewMessage, handleMessageUpdated, handleIncomingCall, handleEmergencyAlert, handleSipIncomingCall);

  useEffect(() => {
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

  const onLogin = useCallback(async (email, password) => {
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
    const msg = errorMessages[result?.error] || result?.error || (lang === 'cz' ? 'Přihlášení se nezdařilo.' : 'Login failed.');
    showToast(msg, 'error');
    return false;
  }, [auth, showToast, lang]);

  const profiles = nexusData.profiles || [];
  
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    const opId = String(activeOperator.id || activeOperator._id || '');
    const rawRoleStr = String(activeRole || '').toLowerCase();
    const isAgencyLevel = rawRoleStr === 'agency admin' || rawRoleStr === 'manager' || rawRoleStr === 'senior operator';
    if (isAgencyLevel) return profiles;
    if (rawRoleStr === 'app owner') return [];

    let filtered = profiles.filter(p => {
      if (!p) return false;
      const asgs = Array.isArray(p.assignees) ? p.assignees : [];
      const ops = Array.isArray(p.operators) ? p.operators : [];
      const isAssigneeMatch = asgs.some(a => String(a?.id || a?._id || a) === opId);
      const isOperatorMatch = ops.some(o => String(o?.id || o?._id || o) === opId);
      const isOwnerMatch = String(p.userId || p.ownerId || '') === opId;
      return isAssigneeMatch || isOperatorMatch || isOwnerMatch;
    });

    if (onlineOnly) filtered = filtered.filter(p => p.status === 'online');
    return filtered;
  }, [profiles, activeOperator, activeRole, onlineOnly]);

  const fetchPlans = useCallback(async () => {
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

  const updatePlans = useCallback(async (newPlans) => {
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

  const activeProfile = useMemo(() => 
    (profiles || []).find(p => p.id === activeProfileId) || (myProfiles || [])[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const filteredMessages = useMemo(() => 
    activeProfileId === 'all' ? (messages || []) : (messages || []).filter(m => m.profileId === activeProfile?.id),
    [messages, activeProfile, activeProfileId]
  );

  const selectedChat = useMemo(() => (messages || []).find(m => m.id === selectedChatId) || null, [messages, selectedChatId]);

  const chatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    if (chatHistory?.[0] && chatHistory[0].chatId === selectedChatId) return chatHistory;
    return (messages || []).filter(m => m.chatId === selectedChatId);
  }, [messages, selectedChatId, chatHistory]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!token || !chatId) return;
    try {
      setIsHistoryLoading(true);
      const res = await axios.get(`${API_BASE}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = (res.data || []).map(m => ({
        ...m,
        time: new Date(m.createdAt).toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
        senderName: m.sender?.name || null
      }));
      setChatHistory(history);
    } catch (err) { console.error('Failed to fetch chat messages:', err); } finally { setIsHistoryLoading(false); }
  }, [token, API_BASE, lang]);

  const totalUnread = useMemo(() => {
    const myProfileIds = new Set((myProfiles || []).map(p => p.id));
    return (messages || []).filter(m => m.status === 'unread' && myProfileIds.has(m.profileId)).length;
  }, [messages, myProfiles]);

  const handleSendMessage = useCallback((text) => {
    if (!text.trim() || !selectedChatId) return;
    const newMessage = { id: Date.now(), profileId: activeProfileId, chatId: selectedChatId, from: 'Nexus Hub', direction: 'OUTBOUND', text: text.trim(), createdAt: new Date().toISOString(), status: 'sent' };
    setMessages(prev => [...prev, newMessage]);
    setMessageValue("");
  }, [selectedChatId, activeProfileId]);

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

  const value = {
    t, lang, setLang,
    activeTab, setActiveTab,
    activeMarket, setActiveMarket,
    loading: nexusData.isDataLoading,
    activeOperator, activeRole, isAllowed,
    isLoggedIn, token, logout: () => {
      logout();
      setShowLanding(true);
      setJustLoggedOut(true);
    }, onLogin,
    onRegisterAgency: auth.handleRegisterAgency,
    onRegisterUser: auth.handleRegisterUser,
    API_BASE,
    showLanding, setShowLanding,
    updatePlans, fetchPlans, subscriptionPlans, isPlansLoading,
    showToast, contextToasts: _toasts,
    isMobile, isNativeApp,
    isSidebarCollapsed, setIsSidebarCollapsed,
    mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab,
    isTranslating, setIsTranslating,
    internalNote, setInternalNote,
    clientNotes,
    detectedMeeting, setDetectedMeeting,
    typingProfiles, setTypingProfiles,
    showPanicConfirm, setShowPanicConfirm,
    chatScrollRef, isUserScrolled,
    incomingRelayCall, setIncomingRelayCall,
    agencyDetailModalData, setAgencyDetailModalData,
    isAddAgencyOpen, setIsAddAgencyOpen,
    isBugReportOpen, setIsBugReportOpen,
    isAddUserOpen, setIsAddUserOpen,
    addUserModalAgencyId, setAddUserModalAgencyId,
    handleAddAgency: () => setIsAddAgencyOpen(true),
    handleAgencyDetail: (agency) => setAgencyDetailModalData(agency),
    handleEditProfile: (profile) => { setEditingProfileData(profile); setIsEditProfileOpen(true); },
    isEditProfileOpen, setIsEditProfileOpen,
    editingProfileData, setEditingProfileData,
    handleSendMessage, handleTranslate, handleSaveNote, handleDeleteNote, startCall, handleQuickSaveMeeting,
    activeProfile, activeProfileId, setActiveProfileId,
    profiles, myProfiles, assignedProfiles: myProfiles,
    onlineOnly, setOnlineOnly,
    totalUnread, messages, filteredMessages,
    selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, chatHistory, fetchChatMessages,
    isHistoryLoading, setIsHistoryLoading,
    messageValue, setMessageValue,
    calViewDate, setCalViewDate,
    globalSettings, fetchGlobalSettings,
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

  useEffect(() => {
    if (isLoggedIn && (authUser?.isAppOwner || authUser?.isManager)) {
      fetchGlobalSettings();
    }
  }, [isLoggedIn, authUser, fetchGlobalSettings]);

  // Consolidated Persistence & URL Routing Logic
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
            <div key={toast.id} style={{ pointerEvents: 'auto', padding: '0.75rem 1.25rem', borderRadius: '12px', color: 'white', background: toast.type === 'error' ? '#ef4444' : '#3b82f6' }}>{toast.message}</div>
          ))}
        </div>
      )}
    </NexusContext.Provider>
  );
};
