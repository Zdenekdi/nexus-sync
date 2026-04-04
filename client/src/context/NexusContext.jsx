import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
  
  // Auth state from custom hook
  const auth = useAuth({ 
    API_BASE,
    t: (k) => k,
    setIsRelayMode: () => {}, 
    setSelectedChatId: () => {}, 
    setActiveProfileId, 
    setShowLanding 
  });
  
  const { activeOperator: authUser, token, logout, isLoggedIn } = auth;
  const [activeOperatorState, setActiveOperatorState] = useState(null);

  // Messages & UI State
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState("");

  // Data Engine initialization
  const nexusData = useNexusData({
    token,
    isLoggedIn,
    API_BASE,
    activeProfileId,
    setActiveOperator: (op) => {
      console.log("[NexusContext] SetActiveOperator received fresh data:", op);
      setActiveOperatorState(op);
    },
    normalizeProfileId: (id) => id, 
    setMessages,
    setActiveSafetySession: () => {},
    setIsTimerActive: () => {},
    setTimeLeft: () => {}
  });

  // ROBUST OPERATOR RESOLUTION - Merge authUser and activeOperatorState
  const activeOperator = useMemo(() => {
    // Merge the auth user (from long-term storage/session) with the freshly fetched operator data
    const base = authUser || {};
    const update = activeOperatorState || {};
    const combined = { ...base, ...update };

    if (!combined.id && !combined._id && !combined.userId && !isLoggedIn) return null;
    
    // EXHAUSTIVE NAME CHECK: Prefer fullname, then name, then email prefix, then fallback
    const rawRole = (combined.role?.name || combined.role || 'OPERATOR').toUpperCase();
    const name = combined.fullname || combined.name || combined.username || (combined.email ? combined.email.split('@')[0] : 'Alice');

    // Return extended object to preserve the ORIGINAL role name for display
    return {
      ...combined,
      id: combined.id || combined._id || combined.userId,
      name,
      role: rawRole,
      originalRole: combined.role?.name || combined.role || 'Operator', // Use this for display
      avatar: combined.avatar || (name ? name.charAt(0) : 'U')
    };
  }, [activeOperatorState, authUser, isLoggedIn]);

  const { activeRole, isAllowed } = usePermissions(activeOperator);

  // Login handler
  const onLogin = useCallback(async (email, password) => {
    const success = await auth.handleLogin(email, password);
    if (success) {
      setShowLanding(false);
      setActiveTab('dashboard');
    }
    return success;
  }, [auth]);

  // Filtering profiles
  const profiles = nexusData.profiles || [];
  
  // Updated myProfiles to respect onlineOnly
  const myProfiles = useMemo(() => {
    if (!activeOperator) return [];
    
    const normalizedRole = activeRole;
    const opId = String(activeOperator.id);

    let filtered = profiles;

    if (normalizedRole !== 'App Owner') {
      if (normalizedRole === 'Agency Admin') {
        filtered = profiles.filter(p => p?.clientId === activeOperator?.clientId);
      } else {
        filtered = profiles.filter(p => {
          if (!p) return false;
          const ops = p.operators || [];
          const asgs = p.assignees || [];
          
          const isOperatorMatch = ops.some(o => {
            const id = String(typeof o === 'object' ? (o.id || o._id || o.operatorId) : o);
            return id === opId;
          });
          
          const isAssigneeMatch = asgs.some(a => {
            const id = String(typeof a === 'object' ? (a.id || a._id) : a);
            return id === opId;
          });
          
          const isOwnerMatch = String(p.userId) === opId || String(p.ownerId) === opId;

          return isOwnerMatch || isOperatorMatch || isAssigneeMatch;
        });
      }
    }

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

  const totalUnread = useMemo(() => 
    messages.filter(m => m.status === 'unread').length
  , [messages]);

  // Translation Helper
  const t = (key) => {
    const tr = {
      cz: {
        dashboard: 'Nástěnka',
        messages: 'Zprávy',
        schedule: 'Plánování',
        profiles: 'Profily',
        webProfiles: 'Web Profily',
        deviceSetup: 'Nastavení Telefonů',
        qa: 'QA Hub',
        logout: 'Odhlásit se',
        myAssignedGirls: 'Moje Holky',
        operationsUnit: 'Operativa',
        emailLabel: 'E-mail',
        passwordLabel: 'Heslo',
        loginButton: 'Přihlásit se',
        forgotPassword: 'Zapomenuté heslo?',
        loginError: 'Neplatné přihlašovací údaje.',
        onlineOnly: 'Dostupné holky',
      },
      en: {
        dashboard: 'Dashboard',
        messages: 'Messages',
        schedule: 'Schedule',
        profiles: 'Profiles',
        webProfiles: 'Web Profiles',
        deviceSetup: 'Device Setup',
        qa: 'QA Hub',
        logout: 'Logout',
        myAssignedGirls: 'My Girls',
        operationsUnit: 'Operations',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        loginButton: 'Login',
        forgotPassword: 'Forgot Password?',
        loginError: 'Invalid credentials.',
        onlineOnly: 'Online only',
      }
    };
    return tr[lang]?.[key] || key;
  };

  const value = {
    t, lang, setLang,
    activeTab, setActiveTab,
    loading: nexusData.isDataLoading,
    activeOperator, activeRole, isAllowed,
    isLoggedIn, token, logout, onLogin,
    API_BASE,
    showLanding, setShowLanding,
    isSidebarCollapsed, setIsSidebarCollapsed,
    activeProfile, activeProfileId, setActiveProfileId,
    profiles, myProfiles,
    onlineOnly, setOnlineOnly,
    totalUnread, messages, filteredMessages,
    messageValue, setMessageValue,
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
