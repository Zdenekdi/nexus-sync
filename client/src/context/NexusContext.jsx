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

export const NexusContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')) 
    ? `http://${window.location.hostname}:5000/api` 
    : 'https://nexus-api.myvnc.com/api');

export const NexusProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('nexus_lang') || 'cz');
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
  
  // Persist important UI states
  React.useEffect(() => {
    localStorage.setItem('nexus_lang', lang);
    localStorage.setItem('nexus_active_tab', activeTab);
    localStorage.setItem('nexus_active_market', activeMarket);
    if (activeProfileId) localStorage.setItem('nexus_active_profile_id', activeProfileId);
    
    // Sync activeTab to URL without reloading to support browser refreshes on the same page
    if (activeTab && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/${activeTab}`);
    }
  }, [lang, activeTab, activeMarket, activeProfileId]);

  const chatScrollRef = React.useRef(null);
  const isUserScrolled = React.useRef(false);
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState("");
  const [clientNotes, setClientNotes] = useState({});
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [_toasts, _setToasts] = useState([]);

  // Mobile and native platform detection
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const isNativeApp = useMemo(() => Capacitor.isNativePlatform(), []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Android hardware back button handler
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

  // Lightweight showToast available to all context consumers
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    _setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  
  const auth = useAuth({ 
    API_BASE,
    t: (k) => k,
    setIsRelayMode: () => {}, 
    setSelectedChatId: () => {}, 
    setActiveProfileId, 
    setShowLanding 
  });
  
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn } = auth;
  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);

  // Global axios interceptor: auto-refresh on 401, logout if refresh fails
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
          // Refresh failed or no refresh token — logout
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
      // Add explicit permission flags for UI components like InboxView
      isAdmin: rawRole === 'AGENCY ADMIN' || rawRole === 'OWNER',
      isManager: rawRole === 'MANAGER' || rawRole === 'SENIOR MANAGER' || rawRole === 'SENIOR OPERATOR',
      isAppOwner: rawRole === 'APP OWNER' || rawRole === 'SUPER_ADMIN',
      isModel: rawRole === 'MODEL' || rawRole === 'MODELKA'
    };
  }, [activeOperatorState, authUser, isLoggedIn]);

  const { activeRole, isAllowed } = usePermissions(activeOperator, nexusData.rolePermissions);

  // Real-time socket connection for messages, calls, and alerts
  const [incomingRelayCall, setIncomingRelayCall] = useState(null);
  const handleNewMessage = useCallback((data) => {
    if (data?.message) {
      setMessages(prev => [...prev, data.message]);
    }
  }, []);
  const handleMessageUpdated = useCallback((data) => {
    if (data?.message) {
      setMessages(prev => prev.map(m => m.id === data.message.id ? { ...m, ...data.message } : m));
    }
  }, []);
  const handleIncomingCall = useCallback((data) => {
    setIncomingRelayCall(data);
  }, []);
  const handleEmergencyAlert = useCallback((_data) => {
    showToast(lang === 'cz' ? '🚨 Nouzový poplach!' : '🚨 Emergency alert!', 'error');
  }, [showToast, lang]);
  const handleSipIncomingCall = useCallback((_data) => {
    // SIP call metadata from relay device — supplementary to JsSIP WebRTC session
    // SipManager handles the actual WebRTC call UI
  }, []);

  useSocket(token, handleNewMessage, handleMessageUpdated, handleIncomingCall, handleEmergencyAlert, handleSipIncomingCall);

  // Push notifications — register FCM token on native platforms when logged in
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
    // Show user-friendly error toast
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
    
    // Normalize IDs and role for matching
    const opId = String(activeOperator.id || activeOperator._id || '');
    const rawRoleStr = String(activeRole || '').toLowerCase();
    
    // High-level roles (Agency Admin, Manager, Senior Operator)
    // should see all profiles returned by the backend (which are already agency-scoped).
    const isAgencyLevel = 
      rawRoleStr === 'agency admin' || 
      rawRoleStr === 'manager' || 
      rawRoleStr === 'senior operator';
    
    // If Agency-level role, skip further manual filtering (API already scopes it)
    if (isAgencyLevel) return profiles;
    
    // App Owner should see 0 models (unless explicitly assigned)
    if (rawRoleStr === 'app owner') return [];

    // For standard Operators, only show explicitly assigned or owned profiles
    let filtered = profiles.filter(p => {
      if (!p) return false;
      
      const asgs = Array.isArray(p.assignees) ? p.assignees : [];
      const ops = Array.isArray(p.operators) ? p.operators : [];
      
      const isAssigneeMatch = asgs.some(a => String(a?.id || a?._id || a) === opId);
      const isOperatorMatch = ops.some(o => String(o?.id || o?._id || o) === opId);
      
      const isOwnerMatch = String(p.userId || p.ownerId || '') === opId;
      
      return isAssigneeMatch || isOperatorMatch || isOwnerMatch;
    });

    if (onlineOnly) {
      filtered = filtered.filter(p => p.status === 'online');
    }

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
      showToast(lang === 'cz' ? 'Nepodařilo se načíst tarify.' : 'Failed to load plans.', 'error');
    } finally {
      setIsPlansLoading(false);
    }
  }, [token, showToast, lang]);

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
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      return { success: false, error: msg };
    } finally {
      setIsPlansLoading(false);
    }
  }, [token]);

  const activeProfile = useMemo(() => 
    (profiles || []).find(p => p.id === activeProfileId) || (myProfiles || [])[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const filteredMessages = useMemo(() => 
    activeProfileId === 'all' 
      ? (messages || []) 
      : (messages || []).filter(m => m.profileId === activeProfile?.id),
    [messages, activeProfile, activeProfileId]
  );

  const selectedChat = useMemo(() => 
     (messages || []).find(m => m.id === selectedChatId) || null,
    [messages, selectedChatId]
  );

  const chatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    return (messages || []).filter(m => m.chatId === selectedChatId);
  }, [messages, selectedChatId]);

  const totalUnread = useMemo(() => {
    const myProfileIds = new Set((myProfiles || []).map(p => p.id));
    return (messages || []).filter(m => m.status === 'unread' && myProfileIds.has(m.profileId)).length;
  }, [messages, myProfiles]);

  const handleSendMessage = useCallback((text) => {
    if (!text.trim() || !selectedChatId) return;
    const newMessage = {
      id: Date.now(),
      profileId: activeProfileId,
      chatId: selectedChatId,
      from: 'Nexus Hub',
      direction: 'OUTBOUND',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      status: 'sent'
    };
    setMessages(prev => [...prev, newMessage]);
    setMessageValue("");
  }, [selectedChatId, activeProfileId]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => {
      setTranslatedText(`[Translated to EN]: ${sourceText}`);
      setIsTranslating(false);
    }, 1000);
  }, [sourceText]);

  const handleSaveNote = useCallback(() => {
    if (!internalNote.trim() || !selectedChatId || !selectedChat) return;
    const from = selectedChat.from;
    const newNote = { id: Date.now(), text: internalNote, author: activeOperator.name, timestamp: new Date().toLocaleTimeString() };
    setClientNotes(prev => ({
      ...prev,
      [from]: [...(prev[from] || []), newNote]
    }));
    setInternalNote("");
  }, [internalNote, selectedChatId, selectedChat, activeOperator]);

  const handleDeleteNote = useCallback((client, noteId) => {
    setClientNotes(prev => ({
      ...prev,
      [client]: (prev[client] || []).filter(n => n.id !== noteId)
    }));
  }, []);

  const startCall = useCallback(() => {
    showToast(lang === 'cz' ? 'Inicializace VoIP spojení...' : 'Initializing secure VoIP relay...', 'info');
  }, [showToast, lang]);

  const handleQuickSaveMeeting = useCallback(() => {
    if (!detectedMeeting) return;
    nexusData.handleQuickSaveMeeting(detectedMeeting);
    setDetectedMeeting(null);
  }, [detectedMeeting, nexusData]);

  const t = (key) => TRANSLATIONS[lang]?.[key] || key;

  const value = {
    // Basic UI and Logic
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
    updatePlans,
    fetchPlans,
    subscriptionPlans,
    isPlansLoading,
    showToast,
    contextToasts: _toasts,
    isMobile,
    isNativeApp,
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
    
    // Relay call (from socket incoming_call event)
    incomingRelayCall, setIncomingRelayCall,

    // Modals
    agencyDetailModalData, setAgencyDetailModalData,
    isAddAgencyOpen, setIsAddAgencyOpen,
    isBugReportOpen, setIsBugReportOpen,
    isAddUserOpen, setIsAddUserOpen,
    addUserModalAgencyId, setAddUserModalAgencyId,

    // Agency / Infrastructure Mock Handlers
    handleAddAgency: () => setIsAddAgencyOpen(true),
    handleAgencyDetail: (agency) => setAgencyDetailModalData(agency),
    handleImpersonateAgency: () => showToast(lang === 'cz' ? 'Tato sekce je v přípravě.' : 'This section is under development.', 'info'),
    handleDeleteAgency: () => showToast(lang === 'cz' ? 'Tato sekce je v přípravě.' : 'This section is under development.', 'info'),
    handleToggleAgencyStatus: () => showToast(lang === 'cz' ? 'Tato sekce je v přípravě.' : 'This section is under development.', 'info'),
    
    // Crucial handlers that were causing "not a function" errors
    handleSendMessage, handleTranslate,
    handleSaveNote, handleDeleteNote,
    startCall, handleQuickSaveMeeting,
    
    // Explicit profile edit modal triggers
    isEditProfileOpen, setIsEditProfileOpen,
    editingProfileData, setEditingProfileData,
    handleEditProfile: (profile) => {
      setEditingProfileData(profile);
      setIsEditProfileOpen(true);
    },
    
    // Profiles and Selection
    activeProfile, activeProfileId, setActiveProfileId,
    profiles, myProfiles,
    assignedProfiles: myProfiles,
    onlineOnly, setOnlineOnly,
    
    // Chat Logic
    totalUnread, messages, filteredMessages,
    selectedChatId, setSelectedChatId,
    selectedChat, chatMessages, isHistoryLoading, setIsHistoryLoading,
    messageValue, setMessageValue,
    
    // Calendar logic
    calViewDate, setCalViewDate,
    
    // Data from useNexusData
    ...nexusData
  };

  return (
    <NexusContext.Provider value={value}>
      {children}
      {/* Context-level toast display */}
      <style>{`
        @keyframes toastProgressShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {_toasts.length > 0 && (
        <div role="alert" aria-live="polite" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none' }}>
          {_toasts.map(toast => {
            const bg = toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#22c55e' : toast.type === 'warning' ? '#f59e0b' : '#3b82f6';
            return (
              <div key={toast.id} style={{
                pointerEvents: 'auto', position: 'relative', overflow: 'hidden',
                padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.85rem',
                color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease',
                background: bg
              }}>
                {toast.message}
                <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: 'rgba(255,255,255,0.35)', animation: 'toastProgressShrink 4s linear forwards' }} />
              </div>
            );
          })}
        </div>
      )}
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error('useNexus must be used within a NexusProvider');
  return context;
};
