import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { 
  MOCK_PROFILES, 
  MOCK_AGENCIES, 
  MOCK_OPERATORS, 
  MOCK_MESSAGES, 
  MOCK_CALENDAR, 
  MOCK_STATS 
} from '../DemoData';

const NexusContext = createContext();

// Centralized API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

export const NexusProvider = ({ children }) => {
  // We get token and basic auth state from useAuth
  // Note: useAuth also needs API_BASE if it makes its own calls
  const auth = useAuth({ 
    API_BASE,
    t: (k) => k, // Minimal t for useAuth internal needs
    setIsRelayMode: () => {}, 
    setSelectedChatId: () => {}, 
    setActiveProfileId: () => {}, 
    setShowLanding: () => {} 
  });
  
  const { user: authUser, token, logout } = auth;
  
  const [lang, setLang] = useState('cz');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Data State - Initialized with empty arrays to prevent mapping crashes
  const [data, setData] = useState({
    profiles: [],
    agencies: [],
    operators: [],
    bookingSchedule: [],
    messages: [],
    stats: {},
    activeSubscription: null
  });

  const [loading, setLoading] = useState(true);
  const [isShiftActive, setIsShiftActive] = useState(false);

  // Auth methods wrapper - ensuring they are functions
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

  // Sync auth user to context
  const activeOperator = useMemo(() => {
    if (!authUser) return null;
    const fullOp = (data.operators || []).find(op => op.id === authUser.id);
    return fullOp || authUser;
  }, [authUser, data.operators]);

  // Permissions logic
  const { activeRole, isAllowed, rolePermissions } = usePermissions(activeOperator);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const hydratedData = {
          profiles: MOCK_PROFILES || [],
          agencies: MOCK_AGENCIES || [],
          operators: MOCK_OPERATORS || [],
          bookingSchedule: MOCK_CALENDAR?.events || [],
          messages: MOCK_MESSAGES || [],
          stats: MOCK_STATS || {},
          activeSubscription: MOCK_AGENCIES?.[0]?.subscription || null
        };
        
        setData(hydratedData);
      } catch (error) {
        console.error("Failed to load Nexus data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      loadData();
    }
  }, [authUser]);

  // Derived State with safety guards
  const profiles = useMemo(() => data.profiles || [], [data.profiles]);
  const agencies = useMemo(() => data.agencies || [], [data.agencies]);
  const operators = useMemo(() => data.operators || [], [data.operators]);
  const messages = useMemo(() => data.messages || [], [data.messages]);
  const calendar = useMemo(() => data.bookingSchedule || [], [data.bookingSchedule]);

  // Filtered Profiles based on role
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    if (activeRole === 'App Owner') return profiles;
    if (activeRole === 'Manager') {
      return profiles.filter(p => p?.clientId === activeOperator?.clientId);
    }
    return profiles.filter(p => 
      p?.userId === activeOperator?.id || 
      (p?.operators || []).some(o => o.id === activeOperator?.id) ||
      (p?.assignees || []).some(a => a.id === activeOperator?.id)
    );
  }, [profiles, activeOperator, activeRole]);

  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === activeProfileId) || myProfiles[0] || null,
    [profiles, activeProfileId, myProfiles]
  );

  const totalUnread = useMemo(() => 
    (messages || []).filter(m => m.status === 'unread').length,
    [messages]
  );

  const getUnreadForProfile = (profileId) => 
    (messages || []).filter(m => m.profileId === profileId && m.status === 'unread').length;

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

        // Login Screen Keys
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

        // Login Screen Keys
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
    // Basic state
    t,
    lang,
    setLang,
    activeTab,
    setActiveTab,
    loading,
    
    // Auth & Identity
    activeOperator,
    activeRole,
    isAllowed,
    rolePermissions,
    isLoggedIn: auth.isLoggedIn,
    token,
    logout,
    onLogin,
    onRegisterAgency,
    onRegisterUser,
    onResetRequest,
    API_BASE,

    // Navigation state
    showLanding,
    setShowLanding,
    showOnboarding,
    setShowOnboarding,

    // Profile & Visibility
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    profiles,
    myProfiles,
    
    // Data collections
    agencies,
    operators,
    messages,
    calendar,
    stats: data.stats || {},
    activeSubscription: data.activeSubscription,
    
    // Status
    isShiftActive,
    setIsShiftActive,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    
    // Handlers
    updateClientName: (phoneNumber, name) => {
      setData(prev => ({ 
        ...prev, 
        clientNames: { ...prev.clientNames, [phoneNumber]: name } 
      }));
    }
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
