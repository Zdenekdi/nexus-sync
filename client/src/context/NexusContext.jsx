import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useNexusData } from '../hooks/useNexusData';

const NexusContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

export const NexusProvider = ({ children }) => {
  const [lang, setLang] = useState('cz');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileId, setActiveProfileId] = useState(null);
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
  const chatScrollRef = React.useRef(null);
  const isUserScrolled = React.useRef(false);
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState("");
  const [clientNotes, setClientNotes] = useState({});
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
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
    setTimeLeft: () => {}
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

  const onLogin = useCallback(async (email, password) => {
    const success = await auth.handleLogin(email, password);
    if (success) {
      setShowLanding(false);
      setActiveTab('dashboard');
    }
    return success;
  }, [auth]);

  const profiles = nexusData.profiles || [];
  
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    
    // Normalize IDs and role for matching
    const opId = String(activeOperator.id || activeOperator._id || '');
    const _userAgencyId = activeOperator?.agencyId || activeOperator?.clientId;
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

  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === activeProfileId) || myProfiles[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const filteredMessages = useMemo(() => 
    messages.filter(m => m.profileId === activeProfile?.id),
    [messages, activeProfile]
  );

  const selectedChat = useMemo(() => 
     messages.find(m => m.id === selectedChatId) || null,
    [messages, selectedChatId]
  );

  const chatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    return messages.filter(m => m.chatId === selectedChatId);
  }, [messages, selectedChatId]);

  const totalUnread = useMemo(() => {
    const myProfileIds = new Set(myProfiles.map(p => p.id));
    return messages.filter(m => m.status === 'unread' && myProfileIds.has(m.profileId)).length;
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
    alert('Initializing secure VoIP relay...');
  }, []);

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
      }
    };
    return tr[lang]?.[key] || key;
  };

  const value = {
    // Basic UI and Logic
    t, lang, setLang,
    activeTab, setActiveTab,
    loading: nexusData.isDataLoading,
    activeOperator, activeRole, isAllowed,
    isLoggedIn, token, logout, onLogin,
    API_BASE,
    showLanding, setShowLanding,
    isSidebarCollapsed, setIsSidebarCollapsed,
    mobileView, setMobileView,
    inlinePanelTab, setInlinePanelTab,
    activeContextTab, setActiveContextTab,
    sourceText, setSourceText,
    translatedText, setTranslatedText,
    isTranslating, setIsTranslating,
    internalNote, setInternalNote,
    clientNotes,
    detectedMeeting, setDetectedMeeting,
    typingProfiles, setTypingProfiles,
    showPanicConfirm, setShowPanicConfirm,
    chatScrollRef, isUserScrolled,
    
    // Crucial handlers that were causing "not a function" errors
    handleSendMessage, handleTranslate,
    handleSaveNote, handleDeleteNote,
    startCall, handleQuickSaveMeeting,
    
    // Profiles and Selection
    activeProfile, activeProfileId, setActiveProfileId,
    profiles, myProfiles,
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
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error('useNexus must be used within a NexusProvider');
  return context;
};
