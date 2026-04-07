import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useNexusData } from '../hooks/useNexusData';
import { useSocket } from '../hooks/useSocket';
import { initPushNotifications, removePushListeners } from '../services/pushService';

export const NexusContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')) 
    ? `http://${window.location.hostname}:5000/api` 
    : 'https://nexus-api.myvnc.com/api');

export const NexusProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('nexus_lang') || 'cz');
  const [activeTab, setActiveTab] = useState(localStorage.getItem('nexus_active_tab') || 'dashboard');
  const [activeMarket, setActiveMarket] = useState(localStorage.getItem('nexus_active_market') || 'cz');
  const [activeProfileId, setActiveProfileId] = useState(localStorage.getItem('nexus_active_profile_id') || null);
  const [showLanding, setShowLanding] = useState(true);
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
  
  // Persist important UI states
  React.useEffect(() => {
    localStorage.setItem('nexus_lang', lang);
    localStorage.setItem('nexus_active_tab', activeTab);
    localStorage.setItem('nexus_active_market', activeMarket);
    if (activeProfileId) localStorage.setItem('nexus_active_profile_id', activeProfileId);
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

  const t = (key) => {
    const tr = {
      cz: {
        dashboard: 'Nástěnka',
        messages: 'Zprávy',
        schedule: 'Plánování',
        profiles: 'Profily',
        webProfiles: 'Web Profily',
        webProfilesDesc: 'Správa biografie a synchronizace galerií',
        gallery: 'Galerie',
        uploadPhoto: 'Nahrát foto',
        biography: 'Biografie',
        services: 'Služby',
        mottoLabel: 'Motto (Nadpis)',
        fullBioLabel: 'Celý text biografie',
        bioPlaceholder: 'Napiš něco o sobě...',
        bioFormattingNote: 'Podporuje základní stylování.',
        saveChanges: 'Uložit změny',
        syncStatus: 'Stav synchronizace',
        ukPrimary: 'Hlavní pro UK',
        euWide: 'Evropský dosah',
        reviewSync: 'Synchronizace recenzí',
        syncingProfileData: 'Synchronizuji data...',
        syncAll: 'Synchronizovat vše',
        deviceSetup: 'Nastavení telefonů',
        qa: 'QA Hub',
        inbox: 'Doručené',
        searchPlaceholder: 'Hledat v konverzacích...',
        noMessages: 'Žádné zprávy.',
        selectConversationDesc: 'Vyberte konverzaci pro zobrazení detailů.',
        backToChat: 'Zpět do chatu',
        typeResponse: 'Napiš odpověď k překladu...',
        translating: 'Překládám...',
        poweredByAi: 'Umělá inteligence',
        logout: 'Odhlásit se',
        myAssignedGirls: 'Moje Holky',
        operationsUnit: 'Operativa',
        emailLabel: 'E-mail',
        passwordLabel: 'Heslo',
        loginButton: 'Přihlásit se',
        forgotPassword: 'Zapomenuté heslo?',
        loginError: 'Neplatné přihlašovací údaje.',
        onlineOnly: 'Dostupné holky',
        agencyOverview: 'Nástěnka agentury',
        agencyOverviewDesc: 'Přehled výkonu vaší agentury a aktuální stav.',
        totalRevenue: 'Celkový obrat',
        vsLastWeek: 'oproti min. týdnu',
        activeBookings: 'Aktivní rezervace',
        thisWeek: 'tento týden',
        totalMessages: 'Celkem zpráv',
        acrossAllProfiles: 'napříč profily',
        conversionRate: 'Konverze',
        trend: ' trend',
        perfByProfile: 'Výkon dle profilu',
        rank: 'Pořadí',
        earnings: 'Výdělky',
        perfByOperator: 'Aktivita operátorů',
        callsHandled: 'Hovory',
        viewMore: 'Zobrazit více',
        noBookingsToday: 'Dnes nejsou žádné rezervace.',
        todaysBookings: 'Dnešní rezervace',
        revenueTrend: 'Trend obratu',
        personalWorkspace: 'Osobní Pracoviště',
        welcomeBack: 'Vítej zpět',
        commissionGrowth: 'Růst provizí',
        stable: 'Stabilní',
        loggedOutSuccess: 'Byl(a) jste úspěšně odhlášen(a).',
        backToHome: 'Zpět na úvod',
        backToProduct: 'Produktové představení',
        systemAdministration: 'Systémová správa',
        infrastructure: 'Infrastruktura',
        maintenance: 'Údržba serveru',
        plansManagement: 'Správa tarifů',
        agencies: 'Agentury',
        globalHealthDesc: 'Živý stav systému a globální výkon sítě.',
        globalOverview: 'Globální přehled',
        activeNodes: 'Aktivní uzly',
        seniorOpDesc: 'Pokročilé řízení práv a dohled nad týmem.',
        aiOptDesc: 'Automatická optimalizace kampaní přes AI.',
        vipSuppDesc: 'Garantovaná podpora do 2 hodin.',
        extraProfiles: 'Balíček profilů (+10)',
        extraProfilesDesc: 'Zvýšení limitu aktivních profilů o 10 slotů.',
        globalTraffic: 'Globální provoz',
        revenueGrowth: 'Růst obratu',
        systemLoad: 'Zátěž systému',
        rolePermissions: 'Správa oprávnění',
        rolePermissionsDesc: 'Definujte přístupová práva pro systémové role a šablony.',
        infraTitle: 'Globální správa',
        agencyMgmtTitle: 'Správa agentury',
        permissions: 'Oprávnění',
        plans: 'Tarify',
        global_features: 'Globální funkce',
        hierarchy: 'Hierarchie',
        analytics: 'Analytika',
        activity: 'Aktivita',
        audit_logs: 'Auditní logy',
        settings: 'Nastavení',
        messaging: 'Zprávy',
        calendar: 'Kalendář',
        web_profiles: 'Web profily',
        device_setup: 'Nastavení zařízení',
        qa_hub: 'QA hub',
        referrals: 'Doporučení',
        inventory: 'Inventář',
        safety: 'Bezpečnost',
        relay: 'Relay',
        relayNativeOnly: 'Relay režim je dostupný pouze v nativní mobilní aplikaci. Přeposílání SMS a hovorů vyžaduje Android oprávnění.',
        blacklist: 'Černá listina',
        sosAlerts: 'SOS Alerty',
        addEntry: 'Přidat záznam',
        phone: 'Telefon',
        licensePlate: 'SPZ',
        description: 'Popis incidentu',
        severity: 'Závažnost',
        warning: 'Varování',
        danger: 'Nebezpečí',
        confirmReport: 'Potvrdit hlášení',
        reportedBy: 'Nahlásil/a',
        confirmations: 'Potvrzení',
        sosActive: 'Aktivní SOS',
        sosHistory: 'Historie SOS',
        triggerSOS: 'Spustit SOS',
        acknowledgeSOS: 'Přijmout',
        resolveSOS: 'Vyřešit',
        fakeCall: 'Falešný hovor',
        checkinTimer: 'Check-in časovač',
        timerMinutes: 'Minuty',
        startTimer: 'Spustit časovač',
        voiceSOS: 'Hlasové SOS',
        locationSharing: 'Sdílení polohy',
        subscriptionPlansTitle: 'Správa tarifů',
        subscriptionPlansSubtitle: 'Nastavení cenových hladin a parametrů předplatného.',
        addOnMarketplaceTitle: 'Doplňkové funkce a role',
        currentPlan: 'Aktuální tarif',
        includedFeatures: 'Obsahuje tyto funkce',
        profilesLimitLabel: 'Limit: {count} profilů',
        editPlanDetails: 'Upravit tarif',
        upgradeNow: 'Upgradovat',
        active: 'Aktivní',
        configure: 'Nastavit',
        noPlanDesc: 'Popis tarifu není k dispozici.'
      },
      en: {
        dashboard: 'Dashboard',
        messages: 'Messages',
        schedule: 'Schedule',
        profiles: 'Profiles',
        webProfiles: 'Web Profiles',
        webProfilesDesc: 'Manage bio and gallery sync',
        gallery: 'Gallery',
        uploadPhoto: 'Upload Photo',
        biography: 'Biography',
        services: 'Services',
        mottoLabel: 'Motto (Headline)',
        fullBioLabel: 'Full Biography',
        bioPlaceholder: 'Write something...',
        bioFormattingNote: 'Supports basic styling.',
        saveChanges: 'Save Changes',
        syncStatus: 'Sync Status',
        ukPrimary: 'Primary for UK',
        euWide: 'European reach',
        reviewSync: 'Review Sync',
        syncingProfileData: 'Syncing data...',
        syncAll: 'Sync All',
        deviceSetup: 'Device Setup',
        qa: 'QA Hub',
        inbox: 'Inbox',
        searchPlaceholder: 'Search conversations...',
        noMessages: 'No messages.',
        selectConversationDesc: 'Select a conversation.',
        backToChat: 'Back to chat',
        typeResponse: 'Type a response...',
        translating: 'Translating...',
        poweredByAi: 'Powered by AI',
        logout: 'Logout',
        myAssignedGirls: 'My Girls',
        operationsUnit: 'Operations',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        loginButton: 'Login',
        forgotPassword: 'Forgot Password?',
        loginError: 'Invalid credentials.',
        onlineOnly: 'Online Only',
        agencyOverview: 'Agency Overview',
        agencyOverviewDesc: 'Performance overview and current status.',
        totalRevenue: 'Total Revenue',
        vsLastWeek: 'vs last week',
        activeBookings: 'Active Bookings',
        thisWeek: 'this week',
        totalMessages: 'Total Messages',
        acrossAllProfiles: 'across all profiles',
        conversionRate: 'Conversion Rate',
        trend: 'trend',
        perfByProfile: 'Performance by Profile',
        rank: 'Rank',
        earnings: 'Earnings',
        perfByOperator: 'Operator Activity',
        callsHandled: 'Calls',
        viewMore: 'View More',
        noBookingsToday: 'No bookings today.',
        todaysBookings: 'Today\'s Bookings',
        revenueTrend: 'Revenue Trend',
        personalWorkspace: 'Personal Workspace',
        welcomeBack: 'Welcome back',
        commissionGrowth: 'Commission Growth',
        stable: 'Stable',
        loggedOutSuccess: 'Successfully logged out.',
        backToHome: 'Back to home',
        backToProduct: 'Product Presentation',
        systemAdministration: 'System Administration',
        infrastructure: 'Infrastructure',
        maintenance: 'Maintenance',
        plansManagement: 'Plans Management',
        agencies: 'Agencies',
        globalHealthDesc: 'Live system health and global network performance.',
        globalOverview: 'Global Overview',
        activeNodes: 'Active Nodes',
        vipSuppDesc: 'Guaranteed support within 2 hours.',
        extraProfiles: 'Extra Profile Pack (+10)',
        extraProfilesDesc: 'Increase active profiles limit by 10 slots.',
        globalTraffic: 'Global Traffic',
        revenueGrowth: 'Revenue Growth',
        systemLoad: 'System Load Overview',
        safety: 'Safety',
        hierarchy: 'Hierarchy',
        analytics: 'Analytics',
        activity: 'Activity',
        relay: 'Relay',
        relayNativeOnly: 'Relay mode is available only in the native mobile app. SMS and call forwarding requires Android permissions.',
        blacklist: 'Blacklist',
        sosAlerts: 'SOS Alerts',
        addEntry: 'Add Entry',
        phone: 'Phone',
        licensePlate: 'License Plate',
        description: 'Incident Description',
        severity: 'Severity',
        warning: 'Warning',
        danger: 'Danger',
        confirmReport: 'Confirm Report',
        reportedBy: 'Reported by',
        confirmations: 'Confirmations',
        sosActive: 'Active SOS',
        sosHistory: 'SOS History',
        triggerSOS: 'Trigger SOS',
        acknowledgeSOS: 'Acknowledge',
        resolveSOS: 'Resolve',
        fakeCall: 'Fake Call',
        checkinTimer: 'Check-in Timer',
        timerMinutes: 'Minutes',
        startTimer: 'Start Timer',
        voiceSOS: 'Voice SOS',
        locationSharing: 'Location Sharing'
      }
    };
    return tr[lang]?.[key] || key;
  };

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
    
    // Crucial handlers that were causing "not a function" errors
    handleSendMessage, handleTranslate,
    handleSaveNote, handleDeleteNote,
    startCall, handleQuickSaveMeeting,
    
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
