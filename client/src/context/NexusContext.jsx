import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useNexusData } from '../hooks/useNexusData';

const NexusContext = createContext();

// Centralized API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

export const NexusProvider = ({ children }) => {
  const [lang, setLang] = useState('cz');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Auth
  const auth = useAuth({ 
    API_BASE,
    t: (k) => k,
    setIsRelayMode: () => {}, 
    setSelectedChatId: () => {}, 
    setActiveProfileId, 
    setShowLanding 
  });
  
  const { user: authUser, token, logout, isLoggedIn } = auth;
  const [activeOperator, setActiveOperator] = useState(null);

  // Messages & UI State
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [messageValue, setMessageValue] = useState("");
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [activeContextTab, setActiveContextTab] = useState('translator');
  const [mobileView, setMobileView] = useState('list');
  const [inlinePanelTab, setInlinePanelTab] = useState(null);

  // Safety Timer
  const [activeSafetySession, setActiveSafetySession] = useState(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);

  // Data Engine integration
  const nexusData = useNexusData({
    token,
    isLoggedIn,
    API_BASE,
    activeProfileId,
    setActiveOperator,
    normalizeProfileId: (id) => id, 
    setMessages,
    setActiveSafetySession,
    setIsTimerActive,
    setTimeLeft
  });

  // Business Logic
  const { activeRole, isAllowed, rolePermissions } = usePermissions(activeOperator || authUser);

  // Handlers for App Actions
  const onLogin = useCallback(async (email, password) => {
    const success = await auth.handleLogin(email, password);
    if (success) {
      setShowLanding(false);
      setActiveTab('dashboard');
    }
    return success;
  }, [auth]);

  const onRegisterAgency = useCallback(async (data) => {
    return await auth.handleRegisterAgency(data);
  }, [auth]);

  const onRegisterUser = useCallback(async (data) => {
    return await auth.handleRegisterUser(data);
  }, [auth]);

  const onResetRequest = useCallback(async (email) => {
    return await auth.handleResetRequest(email);
  }, [auth]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      profileId: activeProfileId,
      direction: 'OUTBOUND',
      text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    setMessageValue("");
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    await new Promise(r => setTimeout(r, 1000));
    setTranslatedText(`[translated] ${sourceText}`);
    setIsTranslating(false);
  };

  const handleSaveNote = () => {
    if (!internalNote.trim()) return;
    alert(`Note saved: ${internalNote}`);
    setInternalNote("");
  };

  // Filtered profiles based on global Profiles array
  const profiles = nexusData.profiles || [];
  const myProfiles = useMemo(() => {
    const op = activeOperator || authUser;
    if (!op) return [];
    if (activeRole === 'App Owner') return profiles;
    if (activeRole === 'Agency Admin') {
      return profiles.filter(p => p?.clientId === op?.clientId);
    }
    // Everyone else (Manager, Senior Operator, Operator) only sees girls they are assigned to
    return profiles.filter(p => 
      p?.userId === op?.id || 
      (p?.operators || []).some(o => o.id === op?.id) ||
      (p?.assignees || []).some(a => a.id === op?.id)
    );
  }, [profiles, activeOperator, authUser, activeRole]);

  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === (activeProfileId || (myProfiles[0]?.id))) || myProfiles[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const selectedChat = useMemo(() => 
    messages.find(m => m.id === selectedChatId) || null,
    [messages, selectedChatId]
  );

  const filteredMessages = useMemo(() => 
    messages.filter(m => m.profileId === activeProfile?.id),
    [messages, activeProfile]
  );

  // Unread counts logic
  const getUnreadForProfile = useCallback((pid) => 
    messages.filter(m => m.profileId === pid && m.status === 'unread').length
  , [messages]);

  const totalUnread = useMemo(() => 
    messages.filter(m => m.status === 'unread').length
  , [messages]);

  // Translation Helper
  const t = (key) => {
    const translations = {
      cz: {
        dashboard: 'Nástěnka',
        messages: 'Zprávy',
        schedule: 'Plánování',
        profiles: 'Profily',
        webProfiles: 'Web Profily',
        deviceSetup: 'Nastavení Telefonů',
        qa: 'QA Hub',
        analytics: 'Analytika',
        settings: 'Nastavení',
        logout: 'Odhlásit se',
        myAssignedGirls: 'Moje Holky',
        activeOps: 'Aktivní Operátoři',
        revenueMtd: 'Obrat (MTD)',
        avgConversion: 'Konverze',
        globalOverview: 'Globální Přehled',
        agencyOverview: 'Přehled Agentury',
        personalWorkspace: 'Pracovní Plocha',
        dailyAgenda: 'Denní Agenda',
        todaysBookings: 'Dnešní Rezervace',
        quickStats: 'Rychlé Statistiky',
        total: 'Celkem',
        noBookingsToday: 'Dnes nejsou žádné rezervace.',
        revenueTrend: 'Trend Obratu',
        commissionGrowth: 'Růst Provizí',
        welcomeBack: 'Vítejte zpět',
        notifications: 'Oznámení',
        backToChat: 'Zpět do chatu',
        internalNotesLog: 'Interní Poznámky',
        recentCommunicationHistory: 'Historie Komunikace',
        loggedBy: 'Zapsal',
        noNotes: 'Žádné poznámky k tomuto klientovi.',
        unnamedClient: 'Nepojmenovaný Klient',
        selectClientToViewQA: 'Vyberte klienta pro zobrazení QA detailů',
        searchPlaceholder: 'Hledat...',
        qaHub: 'QA Hub',
        operationsUnit: 'Operativa',
        agencyUnit: 'Správa Agentury',
        infraUnit: 'Infrastruktura',
        teamHierarchy: 'Tým & Hierarchie',
        auditLog: 'Audit Log',
        agencies: 'Agentury',
        infra: 'Server Status',
        permissions: 'Oprávnění',
        plans: 'Tarify',
        features: 'Globální Funkce',
        stockCard: 'Sklad',
        referralProgram: 'Referraly',
        bookingSchedule: 'Plán rezervací',
        syncStatus: 'Stav synchronizace',
        gallery: 'Galerie',
        uploadPhoto: 'Nahrát foto',
        publicGalleryCap: 'Veřejná Galerie',
        privateGalleryCap: 'Soukromá Galerie',
        biography: 'Biografie',
        services: 'Služby',
        mottoLabel: 'Motto',
        fullBioLabel: 'Celá Biografie',
        bioPlaceholder: 'Zadej biografii...',
        bioFormattingNote: 'Podporuje Emoji',
        saveChanges: 'Uložit změny',
        syncAll: 'Synchronizovat vše',
        syncingProfileData: 'Synchronizace...',
        webProfilesDesc: 'Správa veřejných profilů a biografií.',
        inbox: 'Inbox',
        noMessages: 'Žádné zprávy.',
        typeResponse: 'Napiš odpověď...',
        translating: 'Překládám...',
        poweredByAi: 'AI POWERED',

        emailLabel: 'E-mail',
        passwordLabel: 'Heslo',
        loginButton: 'Přihlásit se',
        forgotPassword: 'Zapomenuté heslo?',
        registerAgency: 'Registrovat Agenturu',
        registerUser: 'Registrovat Uživatele',
        backToLogin: 'Zpět na přihlášení',
        agencyNameLabel: 'Název Agentury',
        fullNameLabel: 'Celé Jméno',
        registrationSuccess: 'Registrace proběhla úspěšně! Nyní se můžete přihlásit.',
        loginError: 'Neplatné přihlašovací údaje.',
        resetSent: 'Instrukce k resetu hesla byly zaslány na váš e-mail.',
        inviteCodeLabel: 'Pozvánkový Kód',
        resetRequestButton: 'Resetovat Heslo',
        registerButton: 'Registrovat'
      },
      en: {
        dashboard: 'Dashboard',
        messages: 'Messages',
        schedule: 'Schedule',
        profiles: 'Profiles',
        webProfiles: 'Web Profiles',
        deviceSetup: 'Device Setup',
        qa: 'QA Hub',
        analytics: 'Analytics',
        settings: 'Settings',
        logout: 'Logout',
        myAssignedGirls: 'My Girls',
        activeOps: 'Active Operators',
        revenueMtd: 'Revenue (MTD)',
        avgConversion: 'Conversion',
        globalOverview: 'Global Overview',
        agencyOverview: 'Agency Overview',
        personalWorkspace: 'Workspace',
        dailyAgenda: 'Daily Agenda',
        todaysBookings: 'Today\'s Bookings',
        quickStats: 'Quick Stats',
        total: 'Total',
        noBookingsToday: 'No bookings for today.',
        revenueTrend: 'Revenue Trend',
        commissionGrowth: 'Commission Growth',
        welcomeBack: 'Welcome back',
        notifications: 'Notifications',
        backToChat: 'Back to Chat',
        internalNotesLog: 'Internal Notes',
        recentCommunicationHistory: 'Communication History',
        loggedBy: 'Logged by',
        noNotes: 'No notes for this client.',
        unnamedClient: 'Unnamed Client',
        selectClientToViewQA: 'Select a client to view QA details',
        searchPlaceholder: 'Search...',
        qaHub: 'QA Hub',
        operationsUnit: 'Operations',
        agencyUnit: 'Agency Admin',
        infraUnit: 'Infrastructure',
        teamHierarchy: 'Team Hierarchy',
        auditLog: 'Audit Log',
        agencies: 'Agencies',
        infra: 'Server Status',
        permissions: 'Permissions',
        plans: 'Plans',
        features: 'Global Features',
        stockCard: 'Inventory',
        referralProgram: 'Referrals',
        bookingSchedule: 'Booking Schedule',
        syncStatus: 'Sync Status',
        gallery: 'Gallery',
        uploadPhoto: 'Upload Photo',
        publicGalleryCap: 'Public Gallery',
        privateGalleryCap: 'Private Gallery',
        biography: 'Biography',
        services: 'Services',
        mottoLabel: 'Headline',
        fullBioLabel: 'Full Biography',
        bioPlaceholder: 'Enter bio...',
        bioFormattingNote: 'Emojis supported',
        saveChanges: 'Save Changes',
        syncAll: 'Sync All',
        syncingProfileData: 'Syncing...',
        webProfilesDesc: 'Manage public profiles and bios.',
        inbox: 'Inbox',
        noMessages: 'No messages.',
        typeResponse: 'Type response...',
        translating: 'Translating...',
        poweredByAi: 'AI POWERED',

        emailLabel: 'Email',
        passwordLabel: 'Password',
        loginButton: 'Login',
        forgotPassword: 'Forgot Password?',
        registerAgency: 'Register Agency',
        registerUser: 'Register User',
        backToLogin: 'Back to Login',
        agencyNameLabel: 'Agency Name',
        fullNameLabel: 'Full Name',
        registrationSuccess: 'Registration successful! You can now login.',
        loginError: 'Invalid credentials.',
        resetSent: 'Reset instructions sent to your email.',
        inviteCodeLabel: 'Invite Code',
        resetRequestButton: 'Reset Password',
        registerButton: 'Register'
      }
    };
    return translations[lang][key] || key;
  };

  const value = {
    t,
    lang,
    setLang,
    activeTab,
    setActiveTab,
    loading: nexusData.isDataLoading,
    
    activeOperator: activeOperator || authUser,
    activeRole,
    isAllowed,
    rolePermissions,
    isLoggedIn,
    token,
    logout,
    onLogin,
    onRegisterAgency,
    onRegisterUser,
    onResetRequest,
    API_BASE,

    showLanding,
    setShowLanding,
    showOnboarding,
    setShowOnboarding,
    isSidebarCollapsed,
    setIsSidebarCollapsed,

    activeProfile,
    activeProfileId,
    setActiveProfileId,
    profiles,
    myProfiles,
    assignedProfiles: myProfiles, 
    
    isSyncing: nexusData.isSyncing,
    syncStatus: nexusData.syncStatus,
    syncProgress: nexusData.syncProgress,
    handleSaveBio: nexusData.handleSaveBio,
    handleSyncAll: nexusData.handleSyncAll,
    bioText: nexusData.bioText,
    setBioText: nexusData.setBioText,

    selectedChatId,
    setSelectedChatId,
    selectedChat,
    filteredMessages,
    messages,
    messageValue,
    setMessageValue,
    handleSendMessage,
    isTranslating,
    handleTranslate,
    sourceText,
    setSourceText,
    translatedText,
    internalNote,
    setInternalNote,
    handleSaveNote,
    activeContextTab,
    setActiveContextTab,
    mobileView,
    setMobileView,
    inlinePanelTab,
    setInlinePanelTab,
    chatMessages: filteredMessages, 
    typingProfiles: {}, 
    clientNames: nexusData.clientNames || {},
    clientNotes: nexusData.clientNotes || {},
    chatScrollRef,
    isUserScrolled,

    agencies: nexusData.agencies || [],
    operators: nexusData.operators || [],
    calendar: nexusData.calendar || [],
    bookingSchedule: nexusData.calendar || [],
    stats: nexusData.stats || {},
    activeSubscription: nexusData.activeSubscription,
    
    isShiftActive: nexusData.isShiftActive,
    setIsShiftActive: nexusData.setIsShiftActive,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    
    activeSafetySession,
    isTimerActive,
    timeLeft,
    setShowPanicConfirm: () => {}, 
    
    calViewDate,
    setCalViewDate,
    setIsBookingModalOpen: nexusData.setIsBookingModalOpen,
    setNewBookingForm: nexusData.setNewBookingForm,
    handleQuickSaveMeeting: nexusData.handleQuickSaveMeeting,

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
