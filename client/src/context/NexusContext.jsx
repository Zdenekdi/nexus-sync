import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

export const NexusProvider = ({ children }) => {
  const { user: authUser, logout } = useAuth();
  const [lang, setLang] = useState('cz');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileId, setActiveProfileId] = useState(null);
  
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

  // Sync auth user to context
  const activeOperator = useMemo(() => {
    if (!authUser) return null;
    // Find full operator details from data.operators if available
    const fullOp = (data.operators || []).find(op => op.id === authUser.id);
    return fullOp || authUser;
  }, [authUser, data.operators]);

  // Permissions logic
  const { activeRole, isAllowed, getPermissions } = usePermissions(activeOperator);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Ensure every field is at least an empty array/object
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
  const clientNames = useMemo(() => data.clientNames || {}, [data.clientNames]);
  const clientNotes = useMemo(() => data.clientNotes || {}, [data.clientNotes]);

  // Filtered Profiles based on role
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    if (activeRole === 'App Owner') return profiles;
    if (activeRole === 'Manager') {
      return profiles.filter(p => p?.clientId === activeOperator?.clientId);
    }
    // Model or Operator
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
        bookingScheduleDesc: 'Správa dnešních výjezdů a bezpečnosti.',
        exportCalendar: 'Export (.ics)',
        syncCalendar: 'Synchronizace',
        recommendedSlots: 'Doporučené časy',
        operatorTip: 'Tip pro operátora',
        operatorTipDesc: 'Nezapomeňte kontrolovat stav Safety Guard u aktivních výjezdů.',
        noEventsToday: 'Dnes nejsou naplánovány žádné akce.',
        add: 'Přidat'
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
        bookingScheduleDesc: 'Manage today\'s outcalls and safety.',
        exportCalendar: 'Export (.ics)',
        syncCalendar: 'Sync Calendar',
        recommendedSlots: 'Recommended Slots',
        operatorTip: 'Operator Tip',
        operatorTipDesc: 'Remember to check Safety Guard status for active bookings.',
        noEventsToday: 'No events scheduled for today.',
        add: 'Add'
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
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    profiles,
    myProfiles,
    agencies,
    operators,
    messages,
    calendar,
    stats: data.stats || {},
    activeSubscription: data.activeSubscription,
    clientNames,
    clientNotes,
    totalUnread,
    getUnreadForProfile,
    isShiftActive,
    setIsShiftActive,
    loading,
    activeOperator,
    activeRole,
    isAllowed,
    getPermissions,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    updateClientName: (phone, name) => {
      setData(prev => ({
        ...prev,
        clientNames: { ...prev.clientNames, [phone]: name }
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
