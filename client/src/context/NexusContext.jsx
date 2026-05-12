import React, { 
  createContext, useState, useEffect, useCallback, useMemo, useRef 
} from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../hooks/useAuth';
import { useNexusData } from '../hooks/useNexusData';
import { AgencyDataGateway } from '../services/agency/AgencyDataGateway';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { ContentSyncService } from '../services/content/ContentSyncService';
import { CommunicationService } from '../services/communication/CommunicationService';
import { WhatsAppAdapter } from '../services/communication/WhatsAppAdapter';
import { SMSAdapter } from '../services/communication/SMSAdapter';
import { WebChatAdapter } from '../services/communication/WebChatAdapter';
import { TRANSLATIONS } from '../translations';
import { NexusContext } from './ContextObject';

// API Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://nexus-hub-server.onrender.com';

/**
 * Main Provider for Nexus Hub.
 * Centralizes all global states: Auth, Data, Navigation, I18n.
 */
export const NexusProvider = ({ children }) => {
  // --- 1. SETTINGS & PERSISTENCE ---
  const getSafeStorage = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; } 
    catch { return fallback; }
  };

  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/en')) return 'en';
      if (path.startsWith('/cz')) return 'cz';
    }
    return getSafeStorage('nexus_lang', 'cz');
  });
  
  const [activeMarket, setActiveMarket] = useState(() => getSafeStorage('nexus_active_market', 'UK'));
  
  // Auth & Routing States (Moved up to prevent hoisting errors)
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [pathname, setPathname] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');

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
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. NAVIGATION & ROUTING LOGIC ---
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const cleanPath = path.replace(/^\/(en|cz)/, '') || '/';
      return cleanPath === '/' || cleanPath === '/guide';
    }
    return true;
  });

  const navigate = useCallback((path, authTab = 'login') => {
    if (typeof window === 'undefined') return;
    
    // If navigating to login/register/guide, set the auth tab if provided
    if (authTab) setAuthInitialTab(authTab);

    // Ensure language prefix is preserved
    let targetPath = path;
    if (lang !== 'cz' && !path.startsWith(`/${lang}`)) {
      targetPath = `/${lang}${path === '/' ? '' : path}`;
    }
    
    window.history.pushState(null, '', targetPath);
    setPathname(targetPath);
  }, [lang]);

  // Sync showLanding and activeTab with pathname
  useEffect(() => {
    const p = pathname.replace(/^\/(en|cz)/, '') || '/';
    if (p === '/' || p === '/guide') {
      setShowLanding(true);
      if (p === '/guide') setActiveTab('guide');
    } else {
      setShowLanding(false);
      const tab = p.substring(1);
      
      // Handle special auth routes
      if (tab === 'register') {
        setAuthInitialTab('register-agency');
      } else if (tab === 'login') {
        setAuthInitialTab('login');
      }
      
      if (tab && tab !== 'login' && tab !== 'register' && tab !== 'dashboard') {
        setActiveTab(tab);
      }
    }
    
    if (pathname.startsWith('/en')) setLang('en');
    else if (pathname.startsWith('/cz')) setLang('cz');
  }, [pathname]);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => localStorage.getItem('nexus_hasSeenOnboarding') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- 3. CORE IDENTITY & AUTH ---
  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('nexus_active_profile_id') || 'all');

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

  const [sosActive, setSosActive] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  // UI Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);
  const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [agencyDetailModalData, setAgencyDetailModalData] = useState(null);
  const [addUserModalAgencyId, setAddUserModalAgencyId] = useState(null);
  const [_toasts, _setToasts] = useState([]);
  const [mobileView, setMobileView] = useState('list');
  const [activeContextTab, setActiveContextTab] = useState('history');
  const [inlinePanelTab, setInlinePanelTab] = useState('notes');
  const [calViewDate, setCalViewDate] = useState(new Date());

  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);

  const t = useCallback((key, params = {}) => {
    try {
      if (!key || typeof key !== 'string') return key || '';
      const safeTranslations = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS) || {};
      const langSet = safeTranslations[lang] || safeTranslations['en'] || {};
      let text = key.split('.').reduce((obj, k) => (obj && obj[k]) ? obj[k] : null, langSet) || key;
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          if (typeof text === 'string') {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        });
      }
      return text;
    } catch (_err) { return String(key || ''); }
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

  const auth = useAuth({ 
    API_BASE,
    _t: t,
    setIsRelayMode: setRelayActiveStable, 
    setSelectedChatId, 
    setActiveProfileId, 
    setShowLanding 
  });
  const { activeOperator: authUser, token, handleLogout: logout, isLoggedIn, handleLogin } = auth;

  const memoizedSetActiveOperator = useCallback((op) => setActiveOperatorState(op), []);
  const memoizedSetMessages = useCallback((msgs) => setMessages(msgs), []);

  const nexusData = useNexusData({
    token, isLoggedIn, API_BASE, activeProfileId,
    setActiveOperator: memoizedSetActiveOperator,
    normalizeProfileId: (id) => id,
    setMessages: memoizedSetMessages,
    setActiveSafetySession: () => {},
    setIsTimerActive: () => {},
    setTimeLeft: () => {},
    showToast, lang
  });

  const activeOperator = useMemo(() => {
    const raw = activeOperatorState || authUser;
    if (!raw) return null;
    return {
      ...raw,
      isAppOwner: raw.role === 'APP_OWNER',
      isAdmin: raw.role === 'ADMIN',
      isManager: raw.role === 'MANAGER',
      isSeniorOperator: raw.role === 'SENIOR_OPERATOR',
      isOperator: raw.role === 'OPERATOR',
      isModel: raw.role === 'MODEL'
    };
  }, [activeOperatorState, authUser]);

  const navigateStable = useCallback((path, tab) => navigate(path, tab), [navigate]);

  const value = useMemo(() => ({
    t, lang, setLang, activeTab, setActiveTab, activeMarket, 
    pathname, navigate: navigateStable, authInitialTab, setAuthInitialTab,
    loading: nexusData.isDataLoading, activeOperator, isLoggedIn, token,
    logout, onLogin: handleLogin, onRegisterAgency: auth.handleRegisterAgency, onRegisterUser: auth.handleRegisterUser,
    API_BASE, showLanding, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    isMobile, isNativeApp, isSidebarOpen, setIsSidebarOpen, isSidebarCollapsed, setIsSidebarCollapsed,
    messages, selectedChatId, setSelectedChatId, messageValue, setMessageValue,
    isEditProfileOpen, setIsEditProfileOpen, isAddAgencyOpen, setIsAddAgencyOpen,
    isAddUserOpen, setIsAddUserOpen, isBugReportOpen, setIsBugReportOpen,
    agencyDetailModalData, setAgencyDetailModalData,
    calViewDate, setCalViewDate, showPanicConfirm, setShowPanicConfirm,
    chatScrollRef, isUserScrolled, showToast, _toasts
  }), [
    t, lang, activeTab, activeMarket, pathname, navigateStable, authInitialTab, 
    nexusData.isDataLoading, activeOperator, isLoggedIn, token, logout, handleLogin,
    showLanding, hasSeenOnboarding, showOnboarding, isMobile, isSidebarOpen, isSidebarCollapsed,
    messages, selectedChatId, messageValue, isEditProfileOpen, isAddAgencyOpen,
    isAddUserOpen, isBugReportOpen, agencyDetailModalData, calViewDate, showPanicConfirm, _toasts
  ]);

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
};
