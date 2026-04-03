import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNexusData } from '../hooks/useNexusData';
import { useSafetyGuard } from '../hooks/useSafetyGuard';
import { useChatLogic } from '../hooks/useChatLogic';
import { useSocket } from '../hooks/useSocket';
import { usePermissions } from '../hooks/usePermissions';
import { useNotifications } from '../hooks/useNotifications';
import { useUILogic } from '../hooks/useUILogic';
import { TRANSLATIONS } from '../translations';
import { Capacitor } from '@capacitor/core';

const NexusContext = createContext();

export const NexusProvider = ({ children }) => {
  // 0. Configuration
  const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

  // 1. Foundation UI State
  const [isRelayMode, setIsRelayMode] = useState(() => localStorage.getItem('nexus_relay_mode') !== 'false');
  const [activeProfileId, setActiveProfileId] = useState(() => {
    const saved = localStorage.getItem('nexus_activeProfileId');
    return (saved && saved !== 'undefined' && saved !== 'null') ? saved : null;
  });
  const [showLanding, setShowLanding] = useState(() => localStorage.getItem('nexus_showLanding') !== 'false');
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('nexus_onboarding_done') !== 'true');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => localStorage.getItem('nexus_maintenance') === 'true');
  const [globalAnnouncement, setGlobalAnnouncement] = useState(() => localStorage.getItem('nexus_announcement') || '');
  const [activeMarket, setActiveMarket] = useState(() => localStorage.getItem('nexus_activeMarket') || 'eu');
  const [lang, setLang] = useState(() => localStorage.getItem('nexus_language') || 'cz');

  // 2. Safety State (Shared with useNexusData and useSafetyGuard)
  const [activeSafetySession, setActiveSafetySession] = useState(null);
  const [activeTimerEvent, setActiveTimerEvent] = useState(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // 3. Foundation UI State
  const [messages, setMessages] = useState([]);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [dbPermissions, setDbPermissions] = useState(null);
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 3.1 Global Overlay States
  const [incomingCall, setIncomingCall] = useState(null);
  const [sipIncomingCall, setSipIncomingCall] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [isEmergencyAckLoading, setIsEmergencyAckLoading] = useState(false);

  const auth = useAuth({ 
    API_BASE, 
    t: (key, data) => t(key, data), 
    setIsRelayMode,
    setSelectedChatId: (id) => localStorage.setItem('nexus_lastSelectedChatId', id), 
    setActiveProfileId,
    setShowLanding
  });

  // 4.1 UI Logic Hooks (Permissions & Notifications)
  const permissions = usePermissions(auth.activeOperator, dbPermissions);
  
  const notifications = useNotifications({
    isNativeApp: Capacitor.isNativePlatform(),
    isAppVisible: typeof document === 'undefined' ? true : document.visibilityState === 'visible',
    t: (key, data = {}) => {
      try {
        let str = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key || '';
        Object.keys(data).forEach(k => {
          str = str.replace(`{${k}}`, data[k]);
        });
        return str;
      } catch {
        return key || '';
      }
    },
    activeRole: permissions.activeRole,
    activeOperator: auth.activeOperator,
    rolePermissions: permissions.rolePermissions
  });

  const t = useCallback((key, data = {}) => {
    try {
      let str = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key || '';
      Object.keys(data).forEach(k => {
        str = str.replace(`{${k}}`, data[k]);
      });
      return str;
    } catch {
      return key || '';
    }
  }, [lang]);

  const data = useNexusData({
    token: auth.token,
    isLoggedIn: auth.isLoggedIn,
    API_BASE,
    activeProfileId,
    setActiveOperator: auth.setActiveOperator,
    normalizeProfileId: (id) => id,
    setMessages,
    setActiveSession: setActiveSafetySession, // map for consistency if needed
    setActiveSafetySession,
    setIsTimerActive,
    setTimeLeft
  });

  // 5.1 Safety Hook
  const safety = useSafetyGuard({
    token: auth.token,
    API_BASE,
    activeProfileId,
    activeOperator: auth.activeOperator,
    activeSafetySession,
    setActiveSafetySession,
    activeTimerEvent,
    setActiveTimerEvent,
    isTimerActive,
    setIsTimerActive,
    timeLeft,
    setTimeLeft,
    addNotification: notifications.addNotification,
    playNotificationSound: notifications.playNotificationSound,
    showToast: notifications.showToast,
    isMobile: Capacitor.isNativePlatform()
  });

  // 5.2 Chat Hook
  const chatLogic = useChatLogic({
    token: auth.token,
    API_BASE,
    activeOperator: auth.activeOperator,
    activeProfileId,
    showToast: notifications.showToast,
    t: (key) => key, // TODO: Bridge to translation system
    addNotification: notifications.addNotification,
    playNotificationSound: notifications.playNotificationSound,
    profiles: data.profiles,
    messages,
    setMessages
  });
  // 5.3 Socket Integration
  useSocket(
    auth.token,
    chatLogic.upsertIncomingMessage, // onNewMessage
    null, // onMessageUpdated (TODO: add if needed)
    setIncomingCall, // onIncomingCall
    (alert) => {
      setEmergencyAlert(alert);
      notifications.addNotification({
        title: 'EMERGENCY ALERT',
        message: alert.message || 'Emergency signal received!',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString(),
        read: false
      });
      notifications.playNotificationSound('emergency');
    }, // onEmergencyAlert
    setSipIncomingCall // onSipIncomingCall
  );
  
  // 5.4 UI Logic Hook
  const ui = useUILogic({
    token: auth.token,
    API_BASE,
    showToast: notifications.showToast,
    lang
  });

  // 6. Navigation & UI State
  const [activeTab, setActiveTab ] = useState(() => localStorage.getItem('nexus_activeTab') || 'dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  // 7. Persistence
  useEffect(() => {
    localStorage.setItem('nexus_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('nexus_language', lang);
    if (!localStorage.getItem('nexus_activeMarket')) {
        setActiveMarket(lang === 'cz' ? 'cz' : 'eu');
    }
  }, [lang]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem('nexus_activeProfileId', activeProfileId);
    } else {
      localStorage.removeItem('nexus_activeProfileId');
    }
  }, [activeProfileId]);

  useEffect(() => localStorage.setItem('nexus_maintenance', isMaintenanceMode), [isMaintenanceMode]);
  useEffect(() => localStorage.setItem('nexus_announcement', globalAnnouncement), [globalAnnouncement]);
  useEffect(() => localStorage.setItem('nexus_activeMarket', activeMarket), [activeMarket]);
  useEffect(() => {
    localStorage.setItem('nexus_showLanding', showLanding);
  }, [showLanding]);

  // 8. Handlers
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const value = useMemo(() => ({
    ...auth, // isLoggedIn, token, activeOperator, etc.
    onLogin: auth.handleLogin,
    onLogout: auth.handleLogout,
    onRegisterAgency: auth.handleRegisterAgency,
    onRegisterUser: auth.handleRegisterUser,
    onResetRequest: auth.handleResetRequest,
    ...data, // profiles, agencies, operators, initData, etc.
    ...permissions, // activeRole, rolePermissions, isAllowed
    ...notifications, // addNotification, showToast, etc.
    ...safety, // handleCheckIn/Out, panic, etc.
    ...chatLogic, // messages (bridge), chatMessages, handleSendMessage, etc.
    ...ui, // mobileView, calViewDate, translation, etc.
    myProfiles: data.profiles || [],
    t,
    API_BASE,
    isRelayMode, setIsRelayMode,
    activeProfileId, setActiveProfileId,
    showLanding, setShowLanding,
    showOnboarding, setShowOnboarding,
    isMaintenanceMode, setIsMaintenanceMode,
    globalAnnouncement, setGlobalAnnouncement,
    activeMarket, setActiveMarket,
    activeSafetySession, setActiveSafetySession,
    activeTimerEvent, setActiveTimerEvent,
    isTimerActive, setIsTimerActive,
    timeLeft, setTimeLeft,
    messages, setMessages,
    activeTab, setActiveTab,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isToolsExpanded, setIsToolsExpanded,
    lang, setLang,
    showOnlyOnline, setShowOnlyOnline,
    dbPermissions, setDbPermissions,
    setIsMobile,
    incomingCall, setIncomingCall,
    sipIncomingCall, setSipIncomingCall,
    emergencyAlert, setEmergencyAlert,
    isEmergencyAckLoading, setIsEmergencyAckLoading,
    toggleSidebar,
    toggleMobileMenu,
    isNativeApp,
    calendar: (data.bookingSchedule || []),
    handleNavigation: setActiveTab
  }), [
    auth, data, permissions, notifications, safety, chatLogic, ui, t,
    isRelayMode, activeProfileId, showLanding, showOnboarding, isMaintenanceMode,
    globalAnnouncement, activeMarket, activeSafetySession, activeTimerEvent,
    isTimerActive, timeLeft, messages, activeTab, setActiveTab, isSidebarCollapsed,
    isMobileMenuOpen, isToolsExpanded, lang, showOnlyOnline, dbPermissions,
    incomingCall, sipIncomingCall, emergencyAlert, isEmergencyAckLoading, isNativeApp
  ]);

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error('useNexus must be used within a NexusProvider');
  return context;
};
