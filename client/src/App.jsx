import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, Search, MessageSquare, Phone, Plus, History, Settings, MoreVertical, 
  Send, User, Clock, Trash2, Edit2, Link, Copy, Globe, Shield, Check, 
  CreditCard, Zap, Cpu, Calendar, AlertTriangle, Building2, Users, 
  ShieldCheck, Mic, MicOff, Bug, LayoutDashboard
} from 'lucide-react';
import { NexusProvider } from './context/NexusContext';
import Sidebar from './components/Navigation/Sidebar';
import RelayControlCenter from './components/RelayControlCenter';
import AgenciesView from './components/Views/AgenciesView';
import GlobalFeaturesView from './components/Views/GlobalFeaturesView';
import InboxView from './components/Views/InboxView';
import ProfilesView from './components/Views/ProfilesView';
import ActivityView from './components/Views/ActivityView';
import SettingsView from './components/Views/SettingsView';
import CalendarView from './components/Views/CalendarView';
import PlansView from './components/Views/PlansView';
import BugReportModal from './components/Modals/BugReportModal';
import EmergencyAlert from './components/Modals/EmergencyAlert';
import AgencyDetailModal from './components/Modals/AgencyDetailModal';
import BookingModal from './components/Modals/BookingModal';
import EditProfileModal from './components/Modals/EditProfileModal';
import AddOperatorModal from './components/Modals/AddOperatorModal';
import AddAgencyModal from './components/Modals/AddAgencyModal';

import OperationsUnit from './components/Units/OperationsUnit';
import AgencyUnit from './components/Units/AgencyUnit';
import InfrastructureUnit from './components/Units/InfrastructureUnit';
import MobileBottomNav from './components/Navigation/MobileBottomNav';


import LandingPage from './components/LandingPage';
import Onboarding, { ONBOARDING_STORAGE_KEY } from './components/Onboarding';
import RelayMode from './components/RelayMode';
// Mock data imports removed for production hardening
import { TRANSLATIONS } from './translations';
import { useSocket } from './hooks/useSocket';
import QAView from './components/QAView';
import PermissionsDashboard from './components/PermissionsDashboard';
import AppOwnerPlansDashboard from './components/AppOwnerPlansDashboard';
import PlansDashboard from './components/PlansDashboard';
import DashboardHome from './components/DashboardHome';
import LoginScreen from './components/LoginScreen';
import ResetPasswordView from './components/ResetPasswordView';
import InventoryView from './components/InventoryView';
import InfraTab from './components/InfraTab';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';
const DEFAULT_ROLE_PERMISSIONS = {
  'App Owner': {
    infrastructure: true,
    agencies: true,
    permissions: true,
    plans: true,
    global_features: true,
    hierarchy: true,
    analytics: false,
    messaging: false,
    calendar: false,
    profiles: false,
    web_profiles: false,
    device_setup: false,
    audit_logs: false,
    qa_hub: false,
    settings: true,
    referrals: true,
    inventory: false
  },
  'Agency Admin': {
    infrastructure: false,
    agencies: false,
    permissions: true,
    plans: false,
    global_features: false,
    hierarchy: true,
    analytics: true,
    messaging: true,
    calendar: true,
    profiles: true,
    web_profiles: true,
    device_setup: true,
    audit_logs: true,
    qa_hub: true,
    settings: true,
    inventory: false
  },
  'Senior Operator': {
    infrastructure: false,
    agencies: false,
    permissions: false,
    plans: false,
    global_features: false,
    hierarchy: false,
    analytics: false,
    messaging: true,
    calendar: true,
    profiles: true,
    web_profiles: true,
    device_setup: false,
    audit_logs: false,
    qa_hub: false,
    settings: false,
    inventory: true
  },
  'Operator': {
    infrastructure: false,
    agencies: false,
    permissions: false,
    plans: false,
    global_features: false,
    hierarchy: false,
    analytics: false,
    messaging: true,
    calendar: true,
    profiles: true,
    web_profiles: false,
    device_setup: true,
    audit_logs: false,
    qa_hub: false,
    settings: true
  },
  'Model': {
    infrastructure: false,
    agencies: false,
    permissions: false,
    plans: false,
    global_features: false,
    hierarchy: false,
    analytics: false,
    messaging: true,
    calendar: true,
    profiles: false,
    web_profiles: false,
    device_setup: false,
    audit_logs: false,
    qa_hub: false,
    settings: false
  }
};

// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

function App() {
  const [appVariant, setAppVariant] = useState('full'); // 'full' or 'relay'
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [tempUser, setTempUser] = useState(null);

  // Detect App Variant (Full vs Relay)
  useEffect(() => {
    const detectVariant = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await Device.getInfo();
          // If native package is relay, force relay variant
          if (info.id === 'com.nexushub.relay') {
            setAppVariant('relay');
            console.log('Native variant detected: RELAY');
          }
        } catch (e) { console.error('Variant detection failed', e); }
      } else {
        // Web detection via URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'relay') {
          setAppVariant('relay');
          console.log('Web variant detected: RELAY');
        }
      }
    };
    detectVariant();
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('nexus_isLoggedIn') === 'true';
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexus_token'));
  const [activeOperator, setActiveOperator] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeOperator');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        let parsed = JSON.parse(saved);
        // Safety migration for role name changes
        if (parsed.role === 'App Owner' || parsed.role === 'App Owner') {
          parsed.role = 'App Owner';
          parsed.name = 'App Owner';
        }
        return parsed;
      }
      return null; // Production: No mock fallback
    } catch { return null; }
  });
  const [activeClient, setActiveClient] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeClient');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
      return null;
    } catch { return null; }
  });

  const [messages, setMessages] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);
  const [profiles, setProfiles] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [agencySettings, setAgencySettings] = useState({ safetyAlertMode: 'MANAGERS_AND_ASSIGNED' });
  const [operators, setOperators] = useState([]);
  const [assigningProfile, setAssigningProfile] = useState(null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('nexus_activeTab') || 'dashboard');
  const [activeProfileId, setActiveProfileId] = useState(() => {
    const saved = localStorage.getItem('nexus_activeProfileId');
    // Return raw value to support alphanumeric IDs like 'ldn-01'
    return (saved && saved !== 'undefined' && saved !== 'null') ? saved : null;
  });
  const [selectedChatId, setSelectedChatId] = useState(() => localStorage.getItem('nexus_lastSelectedChatId') || null);
  const [lang, setLang] = useState(() => localStorage.getItem('nexus_language') || 'en');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar');
  const [incomingCall, setIncomingCall] = useState(null);
  const [clientNotes, setClientNotes] = useState({});
  const [dbPermissions, setDbPermissions] = useState(null);
  const [globalFeatures, setGlobalFeatures] = useState([
    { id: 'ai_trans', label: 'AI Voice Relay (Beta)', desc: 'Enable neural speech-to-speech routing', active: true },
    { id: 'vc_hub', label: 'Cross-Agency Analytics', desc: 'Enable view of aggregated data', active: true },
    { id: 'crm_adv', label: 'Proxy Pooling', desc: 'Allow sharing device nodes', active: true },
    { id: 'stats_bi', label: 'Payout Processing', desc: 'Automate weekly commission transfers', active: false }
  ]);

  const normalizeRole = useCallback((role) => {
    if (!role) return role;
    const roleName = typeof role === 'object' ? role.name : role;
    if (roleName === 'App Owner' || roleName === 'SUPER_ADMIN' || roleName === 'ROOT') return 'App Owner';
    return roleName;
  }, []);

  const activeRole = normalizeRole(activeOperator?.role);

  const rolePermissions = useMemo(() => {
    // We return a mapping of role names to permission objects, as expected by the UI
    const permissionsMap = { ...DEFAULT_ROLE_PERMISSIONS };
    
    // If we have dynamic permissions for the current role from the DB, merge them
    if (dbPermissions) {
      permissionsMap[activeRole] = {
        ...(permissionsMap[activeRole] || {}),
        ...dbPermissions
      };
    }
    
    return permissionsMap;
  }, [activeRole, dbPermissions]);

  const isAllowed = (permission) => {
    const currentPerms = rolePermissions[activeRole] || rolePermissions['Operator'] || {};
    return currentPerms[permission] === true;
  };
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('nexus_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [toasts, setToasts] = useState([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isAppVisible, setIsAppVisible] = useState(() => typeof document === 'undefined' ? true : document.visibilityState === 'visible');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeOperator');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.role === 'App Owner';
      }
      return false;
    } catch { return false; }
  });
  const [sessions, setSessions] = useState([]);
  const [typingProfiles, setTypingProfiles] = useState({});
  const [isShiftActive, setIsShiftActive] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [isStartingSubscription, setIsStartingSubscription] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([
    {
      id: 'basic',
      name: 'Basic Node',
      prices: { cz: '2,900 Kč', eu: '120 €', uk: '110 £', us: '125 $' },
      description: 'Standard relay capabilities for small teams.',
      profilesLimit: 5,
      features: ['feat_sms', 'feat_calls', 'feat_analytics']
    },
    {
      id: 'pro',
      name: 'Professional',
      prices: { cz: '7,500 Kč', eu: '300 €', uk: '280 £', us: '325 $' },
      description: 'Advanced features for growing agencies.',
      profilesLimit: 25,
      features: ['feat_sms', 'feat_calls', 'feat_smart_replies', 'feat_proxies', 'feat_priority', 'feat_audit']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      prices: { cz: '15,000 Kč', eu: '600 €', uk: '550 £', us: '650 $' },
      description: 'Full-scale infrastructure control and customization.',
      profilesLimit: 100,
      features: ['feat_sms', 'feat_calls', 'feat_gateway', 'feat_voice', 'feat_whitelabel', 'feat_training']
    }
  ]);
  const [smartReplies] = useState([]);
  const [stats, setStats] = useState({});
  const [auditLogs] = useState([]);
  const [newAgencyData, setNewAgencyData] = useState({ name: '', email: '', region: 'International', tier: 'Pro' });
  const [newOperatorData, setNewOperatorData] = useState({ name: '', email: '', role: 'Operator', profileId: null });
  const [selectedAgencyDetail, setSelectedAgencyDetail] = useState(null);
  const [originalOperator, setOriginalOperator] = useState(null);
  const [isAddAgencyModalOpen, setIsAddAgencyModalOpen] = useState(false);
  const [isAddOperatorModalOpen, setIsAddOperatorModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [targetAgencyId, setTargetAgencyId] = useState(null);
  const [canNavigateToNotification, setCanNavigateToNotification] = useState(false);
  const [relayApkInfo, setRelayApkInfo] = useState(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => localStorage.getItem('nexus_maintenance') === 'true');
  const [globalAnnouncement, setGlobalAnnouncement] = useState(() => localStorage.getItem('nexus_announcement') || '');
  const [activeMarket, setActiveMarket] = useState(() => {
    const saved = localStorage.getItem('nexus_activeMarket');
    if (saved) return saved;
    return lang === 'cz' ? 'cz' : 'eu';
  });

  useEffect(() => {
    localStorage.setItem('nexus_activeMarket', activeMarket);
  }, [activeMarket]);

  useEffect(() => {
    localStorage.setItem('nexus_maintenance', isMaintenanceMode);
  }, [isMaintenanceMode]);

  useEffect(() => {
    localStorage.setItem('nexus_announcement', globalAnnouncement);
  }, [globalAnnouncement]);
  const SAFETY_SUGGESTIONS = ['10:00', '14:00', '18:00', '22:00'];
  const [detectedMeeting, setDetectedMeeting] = useState(null);

  // DB Permission Sync
  const fetchUserPermissions = useCallback(async () => {
    if (!token || !activeOperator) return;
    try {
      const res = await axios.get(`${API_BASE}/agency/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentRole = res.data.find(r => r.name === activeOperator.role);
      if (currentRole) {
        setDbPermissions(currentRole.permissions);
      }
    } catch (err) {
      console.error('Failed to sync permissions:', err);
    }
  }, [token, activeOperator?.role]);

  const fetchAgencies = useCallback(async () => {
    if (!isLoggedIn || !token || !activeOperator) return;
    try {
      if (activeOperator.role?.toUpperCase() === 'APP OWNER') {
        const res = await axios.get(`${API_BASE}/agency/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAgencies(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch agencies:', err);
    }
  }, [isLoggedIn, token, activeOperator?.role]);

  const fetchGlobalFeatures = useCallback(async () => {
    if (!token || !activeOperator) return;
    try {
      const res = await axios.get(`${API_BASE}/admin/features`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        setGlobalFeatures(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch global features:', err);
    }
  }, [token, activeOperator]);

  useEffect(() => {
    if (isLoggedIn && activeOperator) {
      fetchUserPermissions();
      fetchAgencies();
      if (activeOperator.role?.toUpperCase() === 'APP OWNER') {
        fetchGlobalFeatures();
      }
    }
  }, [isLoggedIn, activeOperator?.role, fetchUserPermissions, fetchAgencies, fetchGlobalFeatures]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('nexus_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  // Notes are now stored in DB – no localStorage sync needed


  useEffect(() => {
    localStorage.setItem('nexus_activeTab', activeTab);
  }, [activeTab]);

  // Auto-scroll: scroll to bottom on new messages unless user scrolled up
  useEffect(() => {
    if (!isUserScrolled.current && chatScrollRef.current) {
      const el = chatScrollRef.current;
      // Direct scrollTop is more reliable than scrollIntoView in Android WebView
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);

  // Reset scroll position when switching to different chat
  useEffect(() => {
    isUserScrolled.current = false;
    if (chatScrollRef.current) {
      const el = chatScrollRef.current;
      // Small timeout to let DOM render first
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }
  }, [selectedChatId]);

  // Detect meeting time and duration in most recent inbound message → offer to save to calendar
  useEffect(() => {
    if (!chatMessages.length || !selectedChatId) { setDetectedMeeting(null); return; }
    const last = [...chatMessages].reverse().find(m => (m.direction || '').toUpperCase() === 'INBOUND');
    if (!last) { setDetectedMeeting(null); return; }
    
    const text = (last.text || '').toLowerCase();
    
    // Improved time regex: 13:00, 13h, 1pm, 1 am, etc.
    const timeMatch = text.match(/\b(\d{1,2})[:\.]?(\d{2})?\s*(am|pm|h)?\b/i);
    if (timeMatch && timeMatch[1]) {
      const hour = parseInt(timeMatch[1]);
      if (hour >= 0 && hour <= 24) {
        // Look for duration: 30min, 1h, 1.5h, pul hodiny
        let duration = '1h';
        if (text.includes('30 min') || text.includes('půl') || text.includes('pul')) duration = '0.5h';
        if (text.includes('15 min') || text.includes('čvrt') || text.includes('ctvrt')) duration = '0.25h';
        if (text.includes('45 min')) duration = '0.75h';
        if (text.includes('1.5h') || text.includes('hodinu a pul')) duration = '1.5h';
        if (text.includes('2h') || text.includes('dvě hod') || text.includes('dve hod')) duration = '2h';
        
        // Look for day: dnes, zitra
        let date = new Date().toISOString().split('T')[0];
        if (text.includes('zitra') || text.includes('zítra')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          date = tomorrow.toISOString().split('T')[0];
        }

        setDetectedMeeting({ 
          time: timeMatch[0], 
          messageId: last.id, 
          text: last.text,
          duration,
          date
        });
      } else {
        setDetectedMeeting(null);
      }
    } else {
      setDetectedMeeting(null);
    }
  }, [chatMessages, selectedChatId]);



  useEffect(() => {
    if (activeTab === 'device-setup') {
      const token = localStorage.getItem('nexus_token');
      if (!token) return;
      fetch(`${API_BASE}/vultr/apk-info`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setRelayApkInfo(d))
        .catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem('nexus_activeProfileId', activeProfileId);
    } else {
      localStorage.removeItem('nexus_activeProfileId');
    }
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem('nexus_language', lang);
  }, [lang]);

  // Visibility tracker
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsAppVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Basic Utilities
  const t = (key, data = {}) => {
    try {
      let str = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key || '';
      Object.keys(data).forEach(k => {
        str = str.replace(`{${k}}`, data[k]);
      });
      return str;
    } catch {
      return key || '';
    }
  };

  const isNativeApp = Capacitor.isNativePlatform();

  // Notification Logic
  const playNotificationSound = useCallback((type = 'info') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'emergency') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(type === 'success' ? 880 : 660, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio feedback blocked by browser policies or not supported');
    }
  }, []);

  const scheduleSystemNotification = useCallback(async (notification) => {
    if (!isNativeApp || isAppVisible) {
      return;
    }

    try {
      const title = notification.title || (notification.callState ? (t('incomingCall') || 'Incoming Call') : (t('notifications') || 'Notification'));
      const body = notification.message || notification.msg || title;

      await LocalNotifications.schedule({
        notifications: [{
          id: Number(String(Date.now()).slice(-9)),
          title,
          body,
          channelId: 'nexus-events',
          schedule: { at: new Date(Date.now() + 50) },
          extra: {
            notificationId: notification.id,
            profileId: notification.profileId ?? null,
            chatId: notification.chatId ?? null,
            from: notification.from ?? null,
            caller: notification.caller ?? null,
            callState: notification.callState ?? null,
            targetType: notification.targetType ?? null,
          },
        }],
      });
    } catch (error) {
      console.warn('[Notifications] Failed to schedule local notification', error);
    }
  }, [isAppVisible, isNativeApp, t]);

  const addNotification = useCallback((input, type = 'info', profileId = null, options = {}) => {
    const payload = typeof input === 'object' && input !== null
      ? input
      : { msg: input, type, profileId, ...options };

    const resolvedType = payload.type || payload.priority || type;
    const resolvedProfileId = payload.profileId ?? profileId ?? null;
    const title = payload.title || null;
    const message = payload.message || payload.msg || '';
    const summary = payload.msg || [title, payload.message].filter(Boolean).join(' — ') || title || message;

    if (activeRole === 'App Owner' && resolvedType !== 'emergency') {
      return;
    }

    const isBookingMsg = [summary, title, message].some(value => value === t('newBooking') || value === 'New Booking' || value === 'Nová rezervace');
    if (isBookingMsg && activeRole !== 'Model') {
      return;
    }

    if (activeRole === 'Model' && resolvedProfileId && resolvedProfileId !== activeOperator?.profileId) {
      return;
    }

    const operatorRole = activeOperator?.role || 'Operator';
    const perms = rolePermissions[operatorRole] || {};

    if (!perms.messaging && resolvedType !== 'emergency') {
      return;
    }

    const id = payload.id ?? Date.now();
    const newNotification = {
      ...payload,
      id,
      title,
      message,
      msg: summary,
      type: resolvedType,
      profileId: resolvedProfileId,
      read: payload.read ?? false,
      timestamp: payload.timestamp || new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
      chatId: payload.chatId ?? null,
      from: payload.from ?? null,
      caller: payload.caller ?? null,
      callState: payload.callState ?? null,
      targetType: payload.targetType ?? null,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setToasts(prev => [newNotification, ...prev]);
    playNotificationSound(resolvedType);
    void scheduleSystemNotification(newNotification);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, [activeOperator, activeRole, playNotificationSound, rolePermissions, scheduleSystemNotification, t]);

  const handleRevokeBinding = async (installationId) => {
    try {
      if (!window.confirm('Are you sure you want to revoke this device? It will no longer receive relay updates.')) return;
      
      await axios.post(`${API_BASE}/device/revoke-binding`, { installationId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh list
      const bindingRes = await axios.get(`${API_BASE}/device/bindings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bindingRes.data && bindingRes.data.ok) {
        setSessions(bindingRes.data.bindings.map(b => ({
          id: b.id,
          installationId: b.installationId,
          device: b.model || b.deviceName || 'Android Mobile',
          location: b.profile?.name || 'Unassigned',
          status: b.active ? 'Active' : 'Revoked',
          current: false
        })));
      }
      showToast('Device connection revoked', 'success');
    } catch (err) {
      console.error('Revoke error:', err);
      showToast('Failed to revoke device', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const markNotificationRead = useCallback((notificationId) => {
    if (notificationId == null) return;
    setNotifications(prev => prev.map(item => item.id === notificationId ? { ...item, read: true } : item));
    setToasts(prev => prev.filter(item => item.id !== notificationId));
  }, []);

  const parseChatId = useCallback((value) => {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return value;
  }, []);

  const normalizeProfileId = useCallback((value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value;
    // Only convert if it is a pure numeric string AND doesn't look like a code (e.g., '123' -> 123, 'ldn-01' -> 'ldn-01')
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return String(value);
  }, []);

  const upsertIncomingMessage = useCallback((incomingMessage) => {
    if (!incomingMessage) return null;

    const resolvedTransport = incomingMessage.transport || incomingMessage.type || 'sms';
    const resolvedText = incomingMessage.text || incomingMessage.content || incomingMessage.body || incomingMessage.message || '';
    const resolvedFrom = incomingMessage.from || incomingMessage.externalId || incomingMessage.phone;
    const resolvedProfileId = normalizeProfileId(
      incomingMessage.profileId ?? incomingMessage.profile?.id ?? activeOperator?.profileId ?? activeProfileId ?? null
    );
    const resolvedChatId = incomingMessage.chatId ?? incomingMessage.id ?? null;
    const resolvedTimestamp = incomingMessage.timestamp || incomingMessage.createdAt || new Date().toISOString();

    const normalizedMessage = {
      ...incomingMessage,
      id: resolvedChatId ?? incomingMessage.id ?? `${resolvedProfileId ?? 'unknown'}:${resolvedFrom}`,
      chatId: resolvedChatId ?? incomingMessage.chatId ?? incomingMessage.id ?? null,
      profileId: resolvedProfileId,
      from: resolvedFrom,
      text: resolvedText,
      content: resolvedText,
      body: resolvedText,
      timestamp: resolvedTimestamp,
      time: new Date(resolvedTimestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
      transport: resolvedTransport,
      type: resolvedTransport,
      status: incomingMessage.status || 'unread'
    };

    setMessages(prev => {
      const existingByChatId = normalizedMessage.chatId != null
        ? prev.findIndex(msg => (msg.chatId || msg.id) === normalizedMessage.chatId)
        : -1;
      const existingByProfileAndFrom = existingByChatId === -1
        ? prev.findIndex(msg => normalizeProfileId(msg.profileId) === normalizedMessage.profileId && msg.from === normalizedMessage.from)
        : -1;
      const existingIndex = existingByChatId !== -1 ? existingByChatId : existingByProfileAndFrom;

      if (existingIndex === -1) {
        return [normalizedMessage, ...prev];
      }

      const existing = prev[existingIndex];
      const merged = {
        ...existing,
        ...normalizedMessage,
        id: existing.chatId ?? existing.id ?? normalizedMessage.chatId ?? normalizedMessage.id,
        chatId: existing.chatId ?? normalizedMessage.chatId ?? existing.id ?? normalizedMessage.id,
        profileId: normalizedMessage.profileId ?? normalizeProfileId(existing.profileId)
      };

      const next = [...prev];
      next.splice(existingIndex, 1);
      return [merged, ...next];
    });

    // Sync with currently open chat history
    if (selectedChatId && (normalizedMessage.chatId === selectedChatId || String(normalizedMessage.chatId) === String(selectedChatId))) {
      const isOutbound = (incomingMessage.direction || '').toUpperCase() === 'OUTBOUND';
      const realMessageId = incomingMessage.id;

      setChatMessages(prev => {
        if (isOutbound && realMessageId) {
          // OUTBOUND: update the existing optimistic message status (sent by this session)
          const existingIdx = prev.findIndex(m =>
            m.id === realMessageId ||
            (m.text === resolvedText && Math.abs(new Date(m.createdAt || m.timestamp || 0) - new Date(resolvedTimestamp)) < 10000)
          );
          if (existingIdx !== -1) {
            // Update status of the existing optimistic message
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...incomingMessage, id: realMessageId };
            return updated;
          }
          // Not found (e.g. different browser tab) — add it
          return [...prev, { ...normalizedMessage, id: realMessageId }];
        }

        // INBOUND: avoid duplicates then append
        const msgId = realMessageId || normalizedMessage.id;
        const exists = prev.some(m =>
          m.id === msgId ||
          (m.text === resolvedText && Math.abs(new Date(m.createdAt || m.timestamp || 0) - new Date(resolvedTimestamp)) < 10000)
        );
        if (exists) return prev;
        return [...prev, { ...normalizedMessage, id: msgId }];
      });
    }

    return normalizedMessage;
  }, [selectedChatId, activeOperator?.profileId, activeProfileId, normalizeProfileId, parseChatId]);

  const resolveNotificationTarget = useCallback((notification = {}) => {
    const profileId = normalizeProfileId(notification.profileId ?? null);

    let matchingMessage = null;
    if (notification.chatId != null) {
      matchingMessage = messages.find(msg => msg.id === notification.chatId) || null;
    }
    if (!matchingMessage && notification.from) {
      matchingMessage = messages.find(msg => (!profileId || normalizeProfileId(msg.profileId) === profileId) && msg.from === notification.from) || null;
    }
    if (!matchingMessage && profileId) {
      matchingMessage = messages.find(msg => normalizeProfileId(msg.profileId) === profileId) || null;
    }

    return {
      targetType: notification.targetType || (notification.callState ? 'call' : 'inbox'),
      profileId: profileId ?? matchingMessage?.profileId ?? null,
      chatId: matchingMessage?.id ?? notification.chatId ?? null,
      from: notification.from ?? matchingMessage?.from ?? notification.caller ?? null,
      caller: notification.caller ?? notification.from ?? matchingMessage?.from ?? null,
      callState: notification.callState ?? null,
    };
  }, [messages, normalizeProfileId]);

  const openNotificationTarget = useCallback((notification = {}) => {
    const target = resolveNotificationTarget(notification);
    if (!target.profileId && !target.chatId && !target.from) return false;
    if (target.profileId) setActiveProfileId(target.profileId);
    setActiveTab('inbox');
    setNotificationPanelOpen(false);
    if (target.chatId) {
      setSelectedChatId(target.chatId);
      if (isMobile) setMobileView('chat');
    } else {
      setSelectedChatId(null);
      if (isMobile) setMobileView('list');
    }
    if (target.from) {
      setClientNotes(prev => prev[target.from] ? prev : { ...prev, [target.from]: [] });
    }
    if (target.targetType === 'call' && target.caller) {
      const targetProfile = profiles.find(profile => profile.id === target.profileId);
      setIncomingCall(prev => prev || {
        profileId: target.profileId,
        profileName: targetProfile?.name,
        caller: target.caller,
      });
    }
    if (notification.id != null) markNotificationRead(notification.id);
    return true;
  }, [isMobile, markNotificationRead, profiles, resolveNotificationTarget]);

  const hasNotificationTarget = useCallback((notification) => {
    const target = resolveNotificationTarget(notification);
    return !!(target.profileId || target.chatId || target.from);
  }, [resolveNotificationTarget]);

  const handleNotificationClick = useCallback((notification) => {
    const opened = openNotificationTarget(notification);
    if (!opened && notification?.id != null) markNotificationRead(notification.id);
  }, [markNotificationRead, openNotificationTarget]);

  const RELAY_RCS_FIRST_LOGIN_PROMPT_KEY = 'nexus_relay_rcs_first_login_prompted';
  const APP_LOCK_TIMEOUT_MS = 2 * 60 * 1000;
  const backgroundedAtRef = useRef(null);
  const unlockInProgressRef = useRef(false);

  // Recover Safety Session and Fetch Real Data on Load
  useEffect(() => {
    const initData = async () => {
      if (!isLoggedIn || !token) return;
      
      try {
        const startTime = performance.now();
        console.log('[Performance] Starting parallel data fetch...');

        const axiosWithTiming = async (url, config = {}) => {
          const s = performance.now();
          const name = url.split('/').pop();
          try {
            const res = await axios.get(url, { ...config, timeout: 10000 });
            console.log(`[Performance] Fetch ${name} took ${(performance.now() - s).toFixed(2)}ms`);
            return res;
          } catch (err) {
            console.warn(`[Performance] Fetch ${name} FAILED or TIMED OUT after ${(performance.now() - s).toFixed(2)}ms`, err);
            return { data: null };
          }
        };

        const [safetyRes, profileRes, chatRes, userRes, bindingRes, statsRes, agencyRes, selfRes] = await Promise.all([
          axiosWithTiming(`${API_BASE}/safety/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/chats`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/agency/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/device/bindings`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/agency/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/agency/all`, { headers: { Authorization: `Bearer ${token}` } }),
          axiosWithTiming(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const endTime = performance.now();
        console.log(`[Performance] Parallel data fetch completed in ${(endTime - startTime).toFixed(2)}ms`);

        if (selfRes && selfRes.data) {
          setActiveOperator(selfRes.data);
          localStorage.setItem('nexus_activeOperator', JSON.stringify(selfRes.data));
        }

        if (statsRes && statsRes.data) {
          setStats(statsRes.data);
        }

        // 1. Process Safety Session
        if (safetyRes.data) {
          setActiveSafetySession(safetyRes.data);
          setIsTimerActive(true);
          const endAt = new Date(safetyRes.data.plannedEndAt).getTime();
          const now = Date.now();
          setTimeLeft(Math.floor((endAt - now) / 1000));
        }

        // 2. Process Profiles
        if (profileRes.data && profileRes.data.length > 0) {
          // Self-healing: Restore Diana's name and ensure ALL profiles are visible by defaulting to online
          const sanitizedProfiles = profileRes.data.map(p => {
            let name = p.name;
            if (p.id === 'ldn-01' && (p.name?.includes('Sophie') || !p.name)) {
              name = 'Diana (Central London)';
            }
            return { ...p, name, status: 'online' }; // Force online for visibility
          });
          setProfiles(sanitizedProfiles);
          setShowOnlyOnline(false); // Force filter off
        }

        // 3. Process Chats/Messages
        if (chatRes.data && chatRes.data.length > 0) {
          const mappedMessages = chatRes.data.map(chat => {
            const latestMessage = chat.messages?.[0] || {};
            const resolvedText = latestMessage.text || latestMessage.content || latestMessage.body || latestMessage.message || 'No messages yet';
            const resolvedTransport = latestMessage.transport || latestMessage.type || 'sms';
            const resolvedTimestamp = chat.lastMessageAt || latestMessage.timestamp || latestMessage.createdAt || new Date().toISOString();

            return {
              id: chat.id,
              chatId: chat.id,
              profileId: normalizeProfileId(chat.profileId),
              from: chat.externalId,
              text: resolvedText,
              content: resolvedText,
              body: resolvedText,
              timestamp: resolvedTimestamp,
              time: new Date(resolvedTimestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
              status: 'read',
              direction: 'inbound',
              transport: resolvedTransport,
              type: resolvedTransport
            };
          });
          setMessages(mappedMessages);
        }

        // 4. Process Agency Users (Team)
        if (userRes.data && userRes.data.length > 0) {
          setOperators(userRes.data);
        }

        // 5. Process Device Bindings
        if (bindingRes.data && bindingRes.data.ok) {
          setSessions(bindingRes.data.bindings.map(b => ({
            id: b.id,
            installationId: b.installationId,
            profileId: b.profileId || b.profile?.id || null,
            device: b.model || b.deviceName || 'Android Mobile',
            location: b.profile?.name || 'Unassigned',
            status: b.active ? 'Active' : 'Revoked',
            current: false
          })));
        }

        // 6. Process Global Agencies
        if (agencyRes && agencyRes.data) {
          setAgencies(agencyRes.data);
        }
      } catch (err) {
        console.warn('[Performance] Error in optimized initData:', err.message);
      }
    };
    initData();
  }, [isLoggedIn, token, normalizeProfileId, parseChatId]);



  // Safety Guard State
  const [activeSafetySession, setActiveSafetySession] = useState(null);
  const [isSafetyLoading, setIsSafetyLoading] = useState(false);
  const [isEmergencyAckLoading, setIsEmergencyAckLoading] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // App Visibility and Real-time Updates
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      setIsAppVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Socket.io Real-time Listeners (if socket is available from useSocket)
    // We'll rely on useSocket hook which likely already handles the socket instance, 
    // but the actual state updates for messages should happen here or where messages are defined.

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const renderNotifications = () => (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
      {toasts.filter(n => {
        if (activeOperator?.isModel) {
          return n.profileId === activeOperator.profileId;
        }
        return true;
      }).map(n => {
        const isInteractive = hasNotificationTarget(n);
        return (
          <div key={n.id} className="glass-card fade-in" style={{
            padding: '1rem 1.5rem',
            background: 'rgba(5, 7, 10, 0.9)',
            borderColor: 'var(--accent-color)',
            borderLeft: '4px solid var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            minWidth: '280px',
            cursor: isInteractive ? 'pointer' : 'default'
          }}
            onClick={isInteractive ? () => handleNotificationClick(n) : undefined}
            onKeyDown={isInteractive ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleNotificationClick(n);
              }
            } : undefined}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <MessageCircle size={18} color="var(--accent-color)" />
              <div>
                {n.title && <div style={{ fontSize: '0.72rem', fontWeight: '900', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{n.title}</div>}
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{n.message || n.msg}</div>
                {isInteractive && <div style={{ fontSize: '0.68rem', color: 'var(--accent-color)', marginTop: '0.35rem', fontWeight: '800' }}>Tap to open chat</div>}
              </div>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setToasts(prev => prev.filter(t => t.id !== n.id));
              }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );


  const [activeCall, setActiveCall] = useState(null);
  const [callTime, setCallTime] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ aw: 'idle', ege: 'idle', tpb: 'idle' });
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSchedule, setBookingSchedule] = useState([]);
  const [selectedScheduleEvent, setSelectedScheduleEvent] = useState(null);
  const [newBookingForm, setNewBookingForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', locationType: 'incall' });
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [bioLang, setBioLang] = useState('EN');
  const [bioText, setBioText] = useState('');
  const [mottoText, setMottoText] = useState('');
  const [openBookingMenuId, setOpenBookingMenuId] = useState(null);
  // Close booking dropdown on outside click
  useEffect(() => {
    if (!openBookingMenuId) return;
    const close = () => setOpenBookingMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openBookingMenuId]);
  const [activeTimerEvent, setActiveTimerEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [safetyAlarmTriggered, setSafetyAlarmTriggered] = useState(false);
  const [departureCheckActive, setDepartureCheckActive] = useState(false);
  const [departureTimeLeft, setDepartureTimeLeft] = useState(0);
  const [departureSessionId, setDepartureSessionId] = useState(null);
  const [departureIntervalMin, setDepartureIntervalMin] = useState(
    () => parseInt(localStorage.getItem('nexus_departure_interval') || '15', 10)
  );

  const lastLocationUpdateRef = useRef(0);

  // Safety Guard Timer Logic
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timeLeft > -660) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft <= -660) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isTimerActive) {
      addNotification({
        id: Date.now(),
        title: 'SAFETY GUARD: SESSION END',
        message: 'Scheduled session time has ended. Please check out!',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false
      });
      playNotificationSound('emergency');
      setSafetyAlarmTriggered(true);
    }
    if (timeLeft === -600 && isTimerActive) {
      addNotification({
        id: Date.now() + 1,
        title: 'EMERGENCY: NO CHECK-OUT',
        message: 'Safety Guard escalating! Contacting agency manager...',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false
      });
      playNotificationSound('emergency');
    }
  }, [timeLeft, isTimerActive, addNotification, playNotificationSound]);

  // Repeating alarm every 40s during overtime — vibrate + sound + native push
  useEffect(() => {
    if (!safetyAlarmTriggered) return;
    const fire = () => {
      playNotificationSound('emergency');
      try { navigator.vibrate?.([600, 200, 600, 200, 600]); } catch (_) {}
      // Native push for background
      if (window.Notification?.permission === 'granted' && document.hidden) {
        try { new window.Notification('⏰ SESSION ENDED', { body: 'Prosím proveď CHECK-OUT!', tag: 'safety-alarm', requireInteraction: true }); } catch (_) {}
      }
    };
    fire(); // immediate first fire
    const interval = setInterval(fire, 40000);
    return () => clearInterval(interval);
  }, [safetyAlarmTriggered, playNotificationSound]);

  // Departure countdown — ticks every second, escalates at 0
  useEffect(() => {
    if (!departureCheckActive || departureTimeLeft <= 0) return;
    const tick = setInterval(() => {
      setDepartureTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          // Auto-escalate
          if (departureSessionId) {
            axios.post(`${API_BASE}/safety/sessions/${departureSessionId}/departure-timeout`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(e => console.warn('[Departure] escalation failed', e));
          }
          setDepartureCheckActive(false);
          addNotification({ title: '🚨 Odchod klienta nepotvrzeno', message: 'Bezpečnostní alert odeslán operátorce a managerce.', priority: 'emergency', timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }), read: false });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [departureCheckActive, departureTimeLeft, departureSessionId, API_BASE, token, addNotification]);

  // Real-time GPS Tracking during active Safety Sessions
  useEffect(() => {
    // Only track during an active session on mobile
    if (!isTimerActive || !activeSafetySession || !isMobile) return;

    let watchId = null;

    const startTracking = async () => {
      try {
        // 1. Check/Request permissions gracefully
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted' && permStatus.location !== 'limited') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted' && req.location !== 'limited') {
            console.warn('[GPS] Location permission denied. Tracking disabled.');
            return;
          }
        }

        // 2. Start high-accuracy watcher
        watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }, (position, err) => {
          if (err) {
            console.warn('[GPS] Position watch error:', err.message);
            return;
          }
          if (!position || !position.coords) return;

          // NEW LOGIC: 
          // If it is an INCALL, only send updates if the alarm is triggered (safetyAlarmTriggered).
          // If it is an OUTCALL, send updates always during the session.
          const isOutcall = activeSafetySession.locationType === 'outcall';
          const shouldSend = isOutcall || safetyAlarmTriggered;
          
          if (!shouldSend) return;

          const now = Date.now();
          // Battery optimization: Send update only every 60 seconds
          if (now - lastLocationUpdateRef.current < 60000) return;

          lastLocationUpdateRef.current = now;
          axios.post(`${API_BASE}/safety/sessions/${activeSafetySession.id}/location`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString()
          }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(e => {
            // Non-critical background failure, just log to console
            console.debug('[GPS] Background update failed:', e.message);
          });
        });
        
        console.log('[GPS] Tracking started for session:', activeSafetySession.id);
      } catch (e) {
        console.error('[GPS] Failed to initialize tracking:', e);
      }
    };

    startTracking();

    return () => {
      // 3. CLEANUP: Always clear the watch when session ends or component unmounts
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
        console.log('[GPS] Tracking stopped.');
      }
    };
  }, [isTimerActive, activeSafetySession, isMobile, API_BASE, token]);

  // API Configuration
  // const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';
  
  // Update handleCheckIn for real backend
  const handleCheckIn = async (event) => {
    try {
      setIsSafetyLoading(true);
      
      // Calculate duration from mock string (e.g. "1h", "2h")
      const durationMatch = event.duration.match(/(\d+)h/);
      const graceMinutes = 10;
      
      const response = await axios.post(`${API_BASE}/safety/sessions`, {
        profileId: activeProfileId,
        bookingId: event.id,
        plannedEndAt: new Date(Date.now() + (durationMatch ? parseInt(durationMatch[1]) : 1) * 3600000),
        graceMinutes,
        locationType: event.locationType || 'incall'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const session = response.data;
      setActiveSafetySession(session);
      setActiveTimerEvent(event);
      
      // Sync local timer
      const durationSeconds = (durationMatch ? parseInt(durationMatch[1]) : 1) * 3600;
      setTimeLeft(durationSeconds);
      setIsTimerActive(true);
      setSafetyAlarmTriggered(false);

      addNotification({
        id: Date.now(),
        title: 'Safety Guard Active',
        message: `Session started for ${event.title}. Security monitored.`,
        priority: 'success',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false
      });
    } catch (error) {
      console.error('Safety Check-in failed:', error);
      addNotification({
        id: Date.now(),
        title: 'Safety Error',
        message: 'Could not start safety session. Please try again.',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false
      });
    } finally {
      setIsSafetyLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeSafetySession) return;
    
    try {
      setIsSafetyLoading(true);
      await axios.post(`${API_BASE}/safety/sessions/${activeSafetySession.id}/check-out`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sessionId = activeSafetySession.id;
      setIsTimerActive(false);
      setActiveTimerEvent(null);
      setActiveSafetySession(null);
      setSafetyAlarmTriggered(false);
      setTimeLeft(0);

      // Start departure confirmation countdown
      setDepartureSessionId(sessionId);
      setDepartureTimeLeft(departureIntervalMin * 60);
      setDepartureCheckActive(true);

      addNotification({ 
        id: Date.now(), 
        title: 'Safety Deactivated', 
        message: `Checkout OK. Potvrď odchod klienta do ${departureIntervalMin} min.`, 
        priority: 'success', 
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }), 
        read: false 
      });
    } catch (error) {
      console.error('Safety Check-out failed:', error);
      addNotification({
        id: Date.now(),
        title: 'Network Error',
        message: 'Could not complete checkout. Please contact manager.',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false
      });
    } finally {
      setIsSafetyLoading(false);
    }
  };

  const handleDepartureConfirmed = async () => {
    setDepartureCheckActive(false);
    if (departureSessionId) {
      try {
        await axios.post(`${API_BASE}/safety/sessions/${departureSessionId}/departure-confirmed`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (_) {}
    }
    setDepartureSessionId(null);
    addNotification({ title: '✓ Odchod potvrzen', message: 'Klient odešel bezpečně.', priority: 'success', timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }), read: false });
  };

    const handleSafetyImOk = async () => {
    if (!activeSafetySession) return;

    try {
      setIsSafetyLoading(true);
      await axios.post(`${API_BASE}/safety/sessions/${activeSafetySession.id}/ack`, {
        extendMinutes: 10
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset local timer window so model has another 10 minutes before escalation.
      setTimeLeft(600);
      setSafetyAlarmTriggered(false);

      addNotification({
        id: Date.now(),
        title: 'Safety Acknowledged',
        message: 'Manager delay acknowledged. Extra 10 minutes granted.',
        priority: 'success',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false,
      });
    } catch (error) {
      console.error('Safety acknowledge failed:', error);
      addNotification({
        id: Date.now(),
        title: 'Acknowledge Failed',
        message: 'Could not confirm safety status. Please check out or contact manager.',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false,
      });
    } finally {
      setIsSafetyLoading(false);
    }
  };

  const handleManagerEmergencyAcknowledge = async () => {
    const sessionId = emergencyAlert?.sessionId;
    if (!sessionId) {
      addNotification({
        id: Date.now(),
        title: 'Acknowledge Failed',
        message: 'Missing session ID in emergency alert.',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false,
      });
      return;
    }

    try {
      setIsEmergencyAckLoading(true);
      await axios.post(`${API_BASE}/safety/sessions/${sessionId}/ack`, {
        extendMinutes: 10,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      addNotification({
        id: Date.now(),
        title: 'Emergency Acknowledged',
        message: 'Session acknowledged and postponed by 10 minutes.',
        priority: 'success',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false,
      });
      setEmergencyAlert(null);
    } catch (error) {
      console.error('Manager emergency acknowledge failed:', error);
      addNotification({
        id: Date.now(),
        title: 'Acknowledge Failed',
        message: 'Could not update emergency session. Try again.',
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false,
      });
    } finally {
      setIsEmergencyAckLoading(false);
    }
  };

  const handlePanic = async () => {
    if (!activeSafetySession) {
      // Create a temporary ad-hoc session if none exists
      try {
        const res = await axios.post(`${API_BASE}/safety/sessions`, {
          profileId: activeProfileId,
          graceMinutes: 0
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        await axios.post(`${API_BASE}/safety/sessions/${res.data.id}/panic`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
         console.error('Emergency panic failed:', err);
      }
    } else {
      try {
        await axios.post(`${API_BASE}/safety/sessions/${activeSafetySession.id}/panic`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Emergency panic failed:', err);
      }
    }

    setSafetyAlarmTriggered(true);
    playNotificationSound('emergency');
    
    addNotification({
      id: Date.now(),
      title: 'PANIC ALERT SENT',
      message: 'Emergency signals dispatched to all agency managers.',
      priority: 'emergency',
      timestamp: new Date().toLocaleTimeString(),
      read: false
    });
  };

  const formatSafetyTime = (seconds) => {
    const absSec = Math.abs(seconds);
    const h = Math.floor(absSec / 3600);
    const m = Math.floor((absSec % 3600) / 60);
    const s = absSec % 60;
    return `${seconds < 0 ? '-' : ''}${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const [showLanding, setShowLanding] = useState(!isLoggedIn && !Capacitor.isNativePlatform());

  // Native app onboarding — show once after install, skip on web
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!isLoggedIn && Capacitor.isNativePlatform()) {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
    }
    return false;
  });

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Relay mode – persisted so the phone stays in relay after restart
  const [isRelayMode, setIsRelayMode] = useState(() => {
    return localStorage.getItem('nexus_relay_mode') === 'true';
  });

  // profileId bound to this device (read from DeviceBinding on server)
  const [boundProfileId, setBoundProfileId] = useState(() => localStorage.getItem('nexus_bound_profile_id'));

  // Persist relay mode state whenever it changes
  useEffect(() => {
    localStorage.setItem('nexus_relay_mode', isRelayMode ? 'true' : 'false');
  }, [isRelayMode]);

  // Helper: should a given operator auto-enter relay mode?
  const shouldAutoRelay = useCallback((operator) => {
    if (!operator) return false;
    if (!Capacitor.isNativePlatform()) return false;
    if (operator.isAppOwner || operator.isManager) return false;
    // Auto-relay only for models; operators open standard dashboard by default.
    return Boolean(operator.isModel);
  }, [normalizeRole]);

  const requestSystemUnlock = useCallback(async () => {
    const relayPlugin = window.Capacitor?.Plugins?.NexusRelay;
    if (!relayPlugin?.confirmDeviceCredential) {
      return false;
    }

    try {
      const result = await relayPlugin.confirmDeviceCredential({
        title: 'Unlock Nexus Hub',
        description: 'Confirm your screen lock to continue'
      });
      return Boolean(result?.unlocked);
    } catch (error) {
      console.warn('[Lock] System unlock failed', error);
      return false;
    }
  }, []);

  const verifyNativeDeviceBinding = useCallback(async (authToken, operator) => {
    if (!isNativeApp || !authToken || !operator?.id) return;

    try {
      const info = await Device.getInfo();
      const deviceId = await Device.getId();
      const installationId = deviceId?.identifier || null;
      if (installationId) {
        localStorage.setItem('nexus_installation_id', installationId);
      }
      const verifyRes = await fetch(`${API_BASE}/device/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          installationId,
          profileId: operator?.profileId || null,
          platform: info?.platform || Capacitor.getPlatform(),
          model: info?.model || null,
          deviceName: info?.name || null,
        }),
      });
      // Store bound profileId so relay outbox polling can use it
      if (verifyRes.ok) {
        const binding = await verifyRes.json();
        if (binding?.profileId) {
          localStorage.setItem('nexus_bound_profile_id', binding.profileId);
          setBoundProfileId(binding.profileId);
        }
      }
    } catch (error) {
      console.warn('[Device] Verification endpoint unavailable', error);
    }
  }, [isNativeApp]);

  // Ensure device is bound on startup if already logged in
  useEffect(() => {
    if (isNativeApp && isLoggedIn && token && activeOperator) {
      void verifyNativeDeviceBinding(token, activeOperator);
    }
  }, [isNativeApp, isLoggedIn, token, activeOperator, verifyNativeDeviceBinding]);

  const maybePromptRcsAccessOnFirstLogin = useCallback(async (operator) => {
    if (!isNativeApp) return;
    if (localStorage.getItem(RELAY_RCS_FIRST_LOGIN_PROMPT_KEY) === 'true') return;
    // Do not show this prompt for users that immediately enter Relay mode.
    if (shouldAutoRelay(operator)) return;

    const relayPlugin = window.Capacitor?.Plugins?.NexusRelay;
    if (!relayPlugin?.ensureReady || !relayPlugin?.openNotificationAccessSettings) {
      return;
    }

    try {
      localStorage.setItem(RELAY_RCS_FIRST_LOGIN_PROMPT_KEY, 'true');
      const status = await relayPlugin.ensureReady();
      if (!status?.ready || status?.rcsMonitoring) {
        return;
      }

      const openSettings = window.confirm(
        t('relayOpenNotificationAccessConfirm') || 'SMS/phone/location permissions are active. For RCS capture, enable Notification Access for Nexus Relay. Open settings now?'
      );
      if (openSettings) {
        await relayPlugin.openNotificationAccessSettings();
      }
    } catch (error) {
      console.warn('[Permissions] First-login RCS prompt failed', error);
    }
  }, [isNativeApp, shouldAutoRelay, t]);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [bookingCollision, setBookingCollision] = useState(null);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [calendarSyncUrl, setCalendarSyncUrl] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('nexus_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Proactive check: Ensure App Owners start with expanded sidebar for clarity
  useEffect(() => {
    if (activeRole === 'App Owner') {
      setIsSidebarCollapsed(false);
    }
  }, [activeOperator]);

  const [clientNames, setClientNames] = useState(() => {
    const saved = localStorage.getItem('nexus_client_names');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('nexus_client_names', JSON.stringify(clientNames));
  }, [clientNames]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!token || !chatId) return;
    try {
      setIsHistoryLoading(true);
      const res = await axios.get(`${API_BASE}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatMessages(res.data || []);
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, API_BASE]);

  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
    } else {
      setChatMessages([]);
    }
  }, [selectedChatId, fetchChatMessages]);

  const fetchAgencySettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/agency/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgencySettings(res.data);
    } catch (err) {
      console.error('Failed to fetch agency settings:', err);
    }
  }, [token, API_BASE]);

  const updateAgencySettings = async (newData) => {
    try {
      const res = await axios.patch(`${API_BASE}/agency/settings`, newData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgencySettings(res.data);
      addNotification({ title: 'Settings Updated', message: 'Agency safety configuration saved.', priority: 'success', timestamp: new Date().toLocaleTimeString(), read: false });
    } catch (err) {
      console.error('Failed to update agency settings:', err);
      addNotification({ title: 'Update Failed', message: 'Could not save agency settings.', priority: 'emergency', timestamp: new Date().toLocaleTimeString(), read: false });
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchAgencySettings();
    }
  }, [activeTab, fetchAgencySettings]);

  useEffect(() => {
    if (activeTab !== 'plans' || !token) return;
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API_BASE}/subscriptions/current`, { headers })
      .then(r => setActiveSubscription(r.data))
      .catch(() => {});
    axios.get(`${API_BASE}/subscriptions/history`, { headers })
      .then(r => setSubscriptionHistory(r.data || []))
      .catch(() => {});
  }, [activeTab, token, API_BASE]);


  const handleSaveAssignees = async (profileId, userIds) => {
    try {
      setIsSafetyLoading(true);
      const res = await axios.patch(`${API_BASE}/profiles/${profileId}/assignees`, { userIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local profiles state to reflect new assignees
      setProfiles(prev => prev.map(p => 
        p.id === profileId ? { ...p, assignees: res.data.assignees } : p
      ));
      
      setAssigningProfile(null);
      addNotification({ 
        title: 'Team Updated', 
        message: 'Profile assignees have been synchronized.', 
        priority: 'success', 
        timestamp: new Date().toLocaleTimeString(), 
        read: false 
      });
    } catch (err) {
      console.error('Failed to save assignees:', err);
      addNotification({ 
        title: 'Error', 
        message: 'Failed to update profile team.', 
        priority: 'emergency', 
        timestamp: new Date().toLocaleTimeString(), 
        read: false 
      });
    } finally {
      setIsSafetyLoading(false);
    }
  };

  const updateClientName = useCallback((phoneNumber, name) => {
    setClientNames(prev => ({
      ...prev,
      [phoneNumber]: name
    }));
  }, []);
  const [activeContextTab, setActiveContextTab] = useState('note');
  const [inlinePanelTab, setInlinePanelTab] = useState(null);

  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('en');
  const [messageValue, setMessageValue] = useState('');
  const [sessionHistories] = useState({});
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isAgencyRolesModalOpen, setIsAgencyRolesModalOpen] = useState(false);
  const [agencyToManage, setAgencyToManage] = useState(null);
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);

  const emergencySafetyAlerts = useMemo(() => {
    const safetyPattern = /SAFETY GUARD|NO CHECK-OUT|PANIC/i;
    return notifications.filter((item) => {
      const title = item.title || '';
      const message = item.message || item.msg || '';
      return item.type === 'emergency' && (item.category === 'safety-guard' || safetyPattern.test(`${title} ${message}`));
    });
  }, [notifications]);

  useEffect(() => {
    if (!isNativeApp) {
      return undefined;
    }

    let actionHandle = null;
    let cancelled = false;

    const setupLocalNotifications = async () => {
      try {
        const permissionStatus = await LocalNotifications.checkPermissions();
        if (permissionStatus.display === 'prompt') {
          await LocalNotifications.requestPermissions();
        }
        if (cancelled) return;

        await LocalNotifications.createChannel({
          id: 'nexus-events',
          name: 'Nexus Events',
          description: 'Interactive alerts for messages and calls',
          importance: 5,
          visibility: 1,
        });
        if (cancelled) return;

        actionHandle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          const extra = event.notification?.extra || {};
          openNotificationTarget({
            id: extra.notificationId ?? null,
            profileId: extra.profileId ?? null,
            chatId: extra.chatId ?? null,
            from: extra.from ?? null,
            caller: extra.caller ?? null,
            callState: extra.callState ?? null,
            targetType: extra.targetType ?? null,
          });
        });
      } catch (error) {
        console.warn('[Notifications] Local notifications unavailable', error);
      }
    };

    setupLocalNotifications();

    return () => {
      cancelled = true;
      actionHandle?.remove?.();
    };
  }, [isNativeApp, openNotificationTarget]);

  const mapPushPayloadToTarget = useCallback((payload = {}) => {
    const data = payload?.data || {};
    const profileId = data.profileId ?? payload.profileId ?? null;
    const chatId = parseChatId(data.chatId ?? payload.chatId ?? null);
    const from = data.from ?? payload.from ?? data.caller ?? payload.caller ?? null;
    const caller = data.caller ?? payload.caller ?? from;
    const targetType = data.targetType ?? payload.targetType ?? (data.callState || payload.callState ? 'call' : 'inbox');
    const callState = data.callState ?? payload.callState ?? null;

    return {
      id: data.notificationId ?? payload.id ?? Date.now(),
      title: payload.title || data.title || null,
      message: payload.body || data.message || data.body || null,
      type: data.type || (targetType === 'call' ? 'emergency' : 'info'),
      profileId,
      chatId,
      from,
      caller,
      callState,
      targetType,
      // Pass-through for relay commands
      to: data.to || null,
      content: data.content || null,
      messageId: data.id || null
    };
  }, [parseChatId]);

  const handleRelaySmsCommand = useCallback(async (data) => {
    const { to, content: text, messageId } = data;
    if (!to || !text) return;

    console.log('[Relay] Executing SMS command', { to, messageId });
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (!plugin) throw new Error('Relay plugin not available');

      // 1. Send SMS via native plugin
      await plugin.sendSms({ to, text });

      // 2. Update status on backend
      if (messageId && !String(messageId).startsWith('relay-')) {
        await axios.patch(`${API_BASE}/messages/${messageId}/status`, 
          { status: 'sent' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('[Relay] SMS command failed', error);
      if (messageId && !String(messageId).startsWith('relay-')) {
        try {
          await axios.patch(`${API_BASE}/messages/${messageId}/status`, 
            { status: 'failed' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (e) {}
      }
    }
  }, [token]);

  const processRelayOutbox = useCallback(async (profileId) => {
    if (!profileId || !token) return;
    
    console.log('[Relay] Checking outbox for profile:', profileId);
    try {
      const response = await axios.get(`${API_BASE}/messages/outbox?profileId=${profileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const pending = response.data || [];
      if (pending.length === 0) return;
      
      console.log(`[Relay] Found ${pending.length} pending messages in outbox`);
      for (const msg of pending) {
        await handleRelaySmsCommand({
          to: msg.to,
          content: msg.text,
          messageId: msg.id
        });
        // Small delay between sends to prevent carrier blocking/flooding
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn('[Relay] Outbox sync failed', error);
    }
  }, [handleRelaySmsCommand, token]);

  const syncSmsHistory = useCallback(async (profileId) => {
    if (!profileId || !token) return;
    
    const lastSyncStr = localStorage.getItem(`nexus_last_sms_sync_${profileId}`);
    let lastTimestamp = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    
    if (lastTimestamp === 0) {
      lastTimestamp = Date.now() - (48 * 60 * 60 * 1000); 
    }

    console.log('[Relay] Starting SMS history sync from:', new Date(lastTimestamp).toLocaleString());
    
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (!plugin) throw new Error('Relay plugin not available');

      const result = await plugin.getSmsHistory({ lastTimestamp, limit: 100 });
      const messages = result.messages || [];
      
      if (messages.length === 0) {
        console.log('[Relay] No new history messages to sync');
        return;
      }

      console.log(`[Relay] Syncing ${messages.length} messages...`);
      const deviceId = localStorage.getItem('nexus_device_id');
      const installationId = localStorage.getItem('nexus_installation_id');

      for (const msg of messages) {
        const payload = {
          deviceId,
          installationId,
          transport: 'sms',
          type: msg.type === 'inbound' ? 'SMS_RECEIVED' : 'SMS_SENT',
          from: msg.address,
          content: msg.body,
          timestamp: new Date(msg.date).toISOString()
        };

        try {
          await axios.post(`${API_BASE}/relay`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn('[Relay] Individual message sync failed', e.message);
        }
        lastTimestamp = Math.max(lastTimestamp, msg.date);
      }

      localStorage.setItem(`nexus_last_sms_sync_${profileId}`, String(lastTimestamp));
    } catch (error) {
      console.error('[Relay] History sync failed', error);
    }
  }, [token]);

  useEffect(() => {
    const relayProfileId = activeOperator?.profileId || boundProfileId;
    if (isRelayMode && relayProfileId) {
      processRelayOutbox(relayProfileId);
      syncSmsHistory(relayProfileId);
      const interval = setInterval(() => {
        processRelayOutbox(relayProfileId);
        syncSmsHistory(relayProfileId);
      }, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isRelayMode, activeOperator?.profileId, boundProfileId, processRelayOutbox, syncSmsHistory]);

  const isPushRegistrationEnabled = useMemo(() => {
    try {
      // DEFAULT TO FALSE to prevent crashes on Android if google-services.json is missing.
      // Enable only if explicitly requested via localStorage for now.
      return localStorage.getItem('nexus_enable_push_registration') === 'true';
    } catch {
      return false;
    }
  }, []);


  useEffect(() => {
    // Guard against Android crash when Firebase is not configured (missing google-services setup).
    if (!isNativeApp || !isLoggedIn || !isPushRegistrationEnabled) {
      return undefined;
    }

    let registrationHandle = null;
    let registrationErrorHandle = null;
    let receivedHandle = null;
    let actionHandle = null;
    let cancelled = false;

    const registerPushTokenOnBackend = async (pushToken) => {
      try {
        await fetch(`${API_BASE}/device/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            token: pushToken,
            platform: Capacitor.getPlatform(),
            operatorId: activeOperator?.id || null,
          }),
        });
      } catch (error) {
        console.warn('[Push] Token registration endpoint is unavailable', error);
      }
    };

    const setupPushNotifications = async () => {
      try {
        const permissionStatus = await PushNotifications.checkPermissions();
        if (permissionStatus.receive === 'prompt') {
          await PushNotifications.requestPermissions();
        }

        const afterRequest = await PushNotifications.checkPermissions();
        if (afterRequest.receive !== 'granted') {
          console.warn('[Push] Permission denied by user');
          return;
        }

        if (cancelled) return;

        registrationHandle = await PushNotifications.addListener('registration', async (tokenValue) => {
          const pushToken = tokenValue?.value;
          if (!pushToken) return;
          localStorage.setItem('nexus_push_token', pushToken);
          await registerPushTokenOnBackend(pushToken);
        });

        registrationErrorHandle = await PushNotifications.addListener('registrationError', (error) => {
          console.warn('[Push] Registration error', error);
        });

        receivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          const mapped = mapPushPayloadToTarget(notification);
          
          if (mapped.type === 'send_sms') {
            handleRelaySmsCommand(mapped);
            return;
          }

          addNotification(mapped);
        });

        actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
          const mapped = mapPushPayloadToTarget(event?.notification || {});
          
          if (mapped.type === 'send_sms') {
            // Already handled by received listener usually, but if tapped from tray:
            handleRelaySmsCommand(mapped);
            return;
          }

          openNotificationTarget(mapped);
        });

        if (cancelled) return;
        await PushNotifications.register();
      } catch (error) {
        console.warn('[Push] Setup failed', error);
      }
    };

    setupPushNotifications();

    return () => {
      cancelled = true;
      registrationHandle?.remove?.();
      registrationErrorHandle?.remove?.();
      receivedHandle?.remove?.();
      actionHandle?.remove?.();
    };
  }, [activeOperator?.id, addNotification, isLoggedIn, isNativeApp, isPushRegistrationEnabled, mapPushPayloadToTarget, openNotificationTarget, token]);

  // ── Push token sync for Relay ──────────────────────────────────────────────
  const [isSyncingPush, setIsSyncingPush] = useState(false);

  const syncPushToken = useCallback(async () => {
    if (!isNativeApp) return false;
    setIsSyncingPush(true);
    try {
      const storedToken = localStorage.getItem('nexus_push_token');
      if (storedToken && token) {
        const response = await fetch(`${API_BASE}/device/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            token: storedToken,
            platform: Capacitor.getPlatform(),
            operatorId: activeOperator?.id || null,
          }),
        });
        return response.ok;
      }
      return false;
    } catch (error) {
      console.warn('[Relay] Push token sync failed', error);
      return false;
    } finally {
      setIsSyncingPush(false);
    }
  }, [activeOperator?.id, isNativeApp, token]);

  // ── Request Relay permissions (SMS + phone) via native plugin ─────────────
  const requestRelayPermissions = useCallback(async () => {
    if (!isNativeApp) return null;
    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (!plugin) return null;
      const status = await plugin.ensureReady();
      return status;
    } catch (error) {
      console.warn('[Relay] Permission request failed', error);
      return null;
    }
  }, [isNativeApp]);

  // ── Startup permission requests (SMS + phone + location) ──────────────────
  // Fired once on app launch regardless of login state.
  // Android will show each dialog only if the permission hasn't been granted yet.
  useEffect(() => {
    if (!isNativeApp) return;

    let cancelled = false;

    const requestStartupPermissions = async () => {
      if (cancelled) return;

      // 1. SMS + phone permissions via NexusRelay plugin
      try {
        const relayPlugin = window.Capacitor?.Plugins?.NexusRelay;
        if (relayPlugin) {
          await relayPlugin.ensureReady();
        }
      } catch (err) {
        console.warn('[Permissions] Relay permission request failed', err);
      }

      if (cancelled) return;

      // 2. Location permission via Geolocation plugin
      try {
        const locStatus = await Geolocation.checkPermissions();
        if (locStatus.location === 'prompt' || locStatus.coarseLocation === 'prompt') {
          await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        }
      } catch (err) {
        console.warn('[Permissions] Location permission request failed', err);
      }
    };

    // 2 s delay so the splash/login screen is visible before dialogs appear
    const timer = setTimeout(requestStartupPermissions, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNativeApp]);

  // Real-time message simulation logic
  useEffect(() => {
    if (!isLoggedIn || !isSimulating) return;

    const interval = setInterval(() => {
      // ~10-15% chance of a new event
      if (Math.random() > 0.85) {
        const availableProfiles = profiles.filter(p => !typingProfiles[p.id]);
        if (availableProfiles.length === 0) return;

        const randomProfile = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
        const randomClient = ["+44 7700 900" + Math.floor(Math.random() * 899 + 100), "+1 212 555 0" + Math.floor(Math.random() * 89 + 10)][Math.floor(Math.random() * 2)];
        
        // Start Typing
        setTypingProfiles(prev => ({ ...prev, [randomProfile.id]: randomClient }));
        
        // Message arrives after short delay
        setTimeout(() => {
          const newMessage = {
            id: Date.now(),
            profileId: randomProfile.id,
            from: randomClient,
            text: [
              "Are you available for a callback?",
              "I'm interested in your services for tonight.",
              "Can we meet in central London?",
              "What's your availability for the weekend?",
              "Hi there! Just saw your profile.",
              "Hello, are you online?",
              "I'd like to book a session."
            ][Math.floor(Math.random() * 7)],
            time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
          };
          
          setMessages(prev => [newMessage, ...prev]);
          addNotification({
            title: t('newInboxMessage') || 'New message',
            message: `${randomProfile.name}: ${newMessage.text}`,
            type: 'info',
            profileId: randomProfile.id,
            chatId: newMessage.id,
            from: newMessage.from,
            targetType: 'inbox',
          });

          setTypingProfiles(prev => {
            const next = { ...prev };
            delete next[randomProfile.id];
            return next;
          });
        }, 4000);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isLoggedIn, profiles, typingProfiles]);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);



  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Call Timer
  useEffect(() => {
    let interval;
    if (activeCall) {
      interval = setInterval(() => setCallTime(prev => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      setCallTime(0);
    };
  }, [activeCall]);

  // Handle Routing & Auth persistence (Clean URLs)
  useEffect(() => {
    const handlePathChange = () => {
      const path = window.location.pathname.replace(/^\//, '') || 'dashboard';
      if (isLoggedIn) {
        if (path === 'login' || path === '') {
          window.history.replaceState(null, '', '/dashboard');
          setActiveTab('dashboard');
        } else {
          setActiveTab(path);
        }
      } else {
        if (path !== 'login') {
          window.history.replaceState(null, '', '/login');
        }
      }
    };

    window.addEventListener('popstate', handlePathChange);
    handlePathChange(); // Initial check
    return () => window.removeEventListener('popstate', handlePathChange);
  }, [isLoggedIn]);

  // Update URL pathname when activeTab changes
  useEffect(() => {
    if (isLoggedIn && activeTab) {
      if (window.location.pathname !== `/${activeTab}`) {
        window.history.pushState(null, '', `/${activeTab}`);
      }
    }
  }, [activeTab, isLoggedIn]);

  // Real API Sync Effect – hydrates profiles from the live backend when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('nexus_token');
    if (!token) return;

    const fetchServerData = async () => {
      try {
        const res = await fetch(`${API_BASE}/profiles`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Enrich profiles with locally persisted quickReplies
            const enriched = data.map(p => ({
              ...p,
              quickReplies: JSON.parse(localStorage.getItem(`nexus_quick_replies_${p.id}`) || 'null') || p.quickReplies || []
            }));
            setProfiles(enriched);
          }
        }
      } catch (err) {
        console.warn('[API] Could not fetch profiles from server, using mock data.', err);
      }
    };

    fetchServerData();
  }, [isLoggedIn]);

  // Login handler – tries real API first, falls back to DemoData
  const handleLogin = async (email, password) => {
    setIsLoginLoading(true);
    const start = performance.now();
    try {
      console.log('[Performance] Starting API login fetch...');
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const end = performance.now();
      console.log(`[Performance] API login fetch took ${(end - start).toFixed(2)}ms`);

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('nexus_token', data.token);
        localStorage.setItem('nexus_isLoggedIn', 'true');
        localStorage.setItem('nexus_activeOperator', JSON.stringify(data.user));
        setToken(data.token);
        setActiveOperator(data.user);
        setIsLoggedIn(true);
        void verifyNativeDeviceBinding(data.token, data.user);
        void maybePromptRcsAccessOnFirstLogin(data.user);
        // Request browser notification permission for background alerts
        if (window.Notification && window.Notification.permission === 'default') {
          window.Notification.requestPermission().catch(() => {});
        }
        if (shouldAutoRelay(data.user)) {
          setIsRelayMode(true);
        } else {
          window.history.replaceState(null, '', '/dashboard');
        }
        setIsLoginLoading(false);
        return;
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || (t('loginError') || 'Invalid credentials'));
      }
    } catch (err) {
      console.error('[API] Real login failed:', err);
      alert('Nebylo možné se spojit s ostrým serverem. Zkontrolujte prosím připojení k internetu a stav serveru.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Initialize Socket Connection
  useSocket(
    token,
    useCallback((newMsg) => {
      const normalizedMessageForNotification = upsertIncomingMessage(newMsg);

      if (!normalizedMessageForNotification) {
        return;
      }

      // Only notify for INBOUND messages (not for our own outbound sends)
      const isInbound = (newMsg.direction || normalizedMessageForNotification.direction || '').toUpperCase() !== 'OUTBOUND';
      if (!isInbound) return;

      // Find profile for notification
      const profile = profiles.find(p => normalizeProfileId(p.id) === normalizeProfileId(normalizedMessageForNotification.profileId));
      if (profile) {
        const chatId = normalizedMessageForNotification.chatId || normalizedMessageForNotification.id;
        const msgText = normalizedMessageForNotification.text || normalizedMessageForNotification.from || '';
        addNotification({
          title: (normalizedMessageForNotification.transport || normalizedMessageForNotification.type) === 'rcs' ? 'New RCS message' : (t('newInboxMessage') || 'New message'),
          message: `${profile.name}: ${msgText}`,
          type: 'info',
          profileId: profile.id,
          chatId,
          from: normalizedMessageForNotification.from,
          targetType: 'inbox',
        });
        // Browser notification when tab is not focused
        if (document.hidden && window.Notification?.permission === 'granted') {
          try {
            const n = new window.Notification(`📩 ${profile.name}`, {
              body: msgText,
              icon: '/favicon.ico',
              tag: `nexus-msg-${chatId}`,
              requireInteraction: false,
            });
            n.onclick = () => {
              window.focus();
              setActiveTab('inbox');
              setSelectedChatId(String(chatId));
            };
          } catch (e) { console.warn('[Notif] Browser notification failed', e); }
        }
      }
    }, [profiles, t, addNotification, normalizeProfileId, upsertIncomingMessage, setActiveTab, setSelectedChatId]),
    useCallback((updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    }, []),
    useCallback((callData) => {
      // Find profile for notification
      const profile = profiles.find(p => p.id === callData.profileId);
      if (profile) {
        setIncomingCall({
          profileId: callData.profileId,
          profileName: profile.name,
          caller: callData.from,
        });
        addNotification({
          title: t('incomingCall') || 'Incoming Call',
          message: `${profile.name} · ${callData.from || 'Unknown caller'}`,
          type: 'emergency',
          profileId: callData.profileId,
          from: callData.from,
          caller: callData.from,
          callState: 'RINGING',
          targetType: 'call',
        });
      }
    }, [profiles, t, addNotification]),
    useCallback((alertData) => {
      console.log('🚨 EMERGENCY ALERT RECEIVED:', alertData);
      setEmergencyAlert(alertData);
      playNotificationSound('emergency');
      
      // Auto-switch to a dash or show overlay
      addNotification({
        title: `🚨 EMERGENCY: ${alertData.profileName}`,
        message: `Type: ${alertData.type.toUpperCase()}. Active session ${alertData.sessionId}`,
        priority: 'emergency',
        timestamp: new Date().toLocaleTimeString(),
        read: false
      });
    }, [addNotification, t])
  );

  useEffect(() => {
    const relayPlugin = window.Capacitor?.Plugins?.NexusRelay;
    if (!relayPlugin?.addListener || !isLoggedIn) {
      return undefined;
    }

    let smsListener;
    let rcsListener;

    const handleNativeIncomingMessage = (payload, transport) => {
      const normalizedMessage = upsertIncomingMessage({
        ...payload,
        transport,
        type: transport,
        text: payload?.text || payload?.content || payload?.body || '',
      });

      if (!normalizedMessage) {
        return;
      }

      const profile = profiles.find(p => normalizeProfileId(p.id) === normalizeProfileId(normalizedMessage.profileId));
      if (profile) {
        addNotification({
          title: transport === 'rcs' ? 'New RCS message' : (t('newInboxMessage') || 'New message'),
          message: `${profile.name}: ${normalizedMessage.text || normalizedMessage.from || ''}`,
          type: 'info',
          profileId: profile.id,
          chatId: normalizedMessage.chatId || normalizedMessage.id,
          from: normalizedMessage.from,
          targetType: 'inbox',
        });
      }
    };

    smsListener = relayPlugin.addListener('onSmsReceived', (payload) => handleNativeIncomingMessage(payload, 'sms'));
    rcsListener = relayPlugin.addListener('onRcsReceived', (payload) => handleNativeIncomingMessage(payload, 'rcs'));

    return () => {
      smsListener?.remove?.();
      rcsListener?.remove?.();
    };
  }, [addNotification, isLoggedIn, normalizeProfileId, profiles, t, upsertIncomingMessage]);

  // Dynamic Document Title
  useEffect(() => {
    document.title = isLoggedIn ? 'Nexus Hub' : 'Nexus Systems';
  }, [isLoggedIn]);

  // Model Profile Locking Effect
  useEffect(() => {
    if (activeOperator?.isModel && activeOperator.profileId) {
      setActiveProfileId(activeOperator.profileId);
    }
  }, [activeOperator]);

  const addAgency = useCallback(async () => {
    if (!newAgencyData.name) return;
    try {
      const resp = await axios.post(`${API_BASE}/agency`, newAgencyData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.data) {
        setAgencies(prev => [...prev, {
          ...resp.data,
          inviteCode: resp.data.inviteCode,
          subscription: { plan: resp.data.tier, status: 'active', endDate: 'Unlimited' }
        }]);
        setIsAddAgencyModalOpen(false);
        setNewAgencyData({ name: '', email: '', region: 'International', tier: 'Pro' });
        if (resp.data.inviteCode) {
          showToast(`Agentura vytvořena! Invitation code: ${resp.data.inviteCode}`, 'success');
        }
      }
    } catch (err) {
      console.error('Failed to add agency:', err);
      alert('Failed to add agency');
    }
  }, [newAgencyData, token, showToast]);

  const deleteAgency = async (id) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this agency and all its team members? This action cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE}/agency/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAgencies(prev => prev.filter(a => a.id !== id));
        setOperators(prev => prev.filter(o => o.agencyId !== id));
        setProfiles(prev => prev.filter(p => p.agencyId !== id));
      } catch (err) {
        console.error('Failed to delete agency:', err);
        alert('Failed to delete agency');
      }
    }
  };

  const addOperator = useCallback(async () => {
    if (!newOperatorData.name || !newOperatorData.email || !targetAgencyId) return;
    
    try {
      // Auto-generate password if not manually provided
      const autoPassword = `Nexus_${Math.floor(1000 + Math.random() * 9000)}`;
      const finalPassword = (newOperatorData.password && newOperatorData.password !== 'password123') ? newOperatorData.password : autoPassword;

      const resp = await axios.post(`${API_BASE}/agency/users`, {
        name: newOperatorData.name,
        email: newOperatorData.email,
        password: finalPassword,
        roleName: newOperatorData.role,
        agencyId: targetAgencyId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.data) {
        setOperators(prev => [...prev, resp.data]);
        setIsAddOperatorModalOpen(false);
        alert(`${t('operatorAddedSuccess') || 'User created successfully.'}\nTemp Password: ${finalPassword}`);
        setNewOperatorData({ name: '', role: 'Operator', email: '', password: 'password123' });
      }
    } catch (err) {
      console.error('Failed to add operator:', err);
      alert('Failed to add operator');
    }
  }, [newOperatorData, targetAgencyId, token, t]);

  const deleteOperator = (id) => {
    if (window.confirm('Remove this team member?')) {
      setOperators(prev => prev.filter(o => o.id !== id));
    }
  };


  // Memoized Derived Data
  const availableOperators = useMemo(() =>
    activeRole === 'App Owner' ? operators : operators.filter(op => op.agencyId === activeOperator?.agencyId),
    [activeOperator?.agencyId, activeRole, operators]
  );

  const myProfiles = useMemo(() => {
    // 1. App Owner sees everything
    if (activeRole === 'App Owner') return profiles;
    
    // 2. Managers and Senior Operators should see their agency's models.
    // The backend filters by agencyId, so profiles array already only has relevant ones.
    const isAgencyManagerOrSeniorOp = activeRole === 'Agency Manager' || activeRole === 'Agency Admin' || activeRole === 'Senior Operator' || activeOperator?.role?.isManager;
    
    if (isAgencyManagerOrSeniorOp) {
      // NUCLEAR FALLBACK: If profiles array exists, just return it. 
      // This bypasses any potential agencyId mismatch in the frontend state.
      return profiles;
    }

    // 3. Standard operator logic: only assigned ones
    const assigned = profiles.filter(p => 
      p.operators?.some(op => op.id === activeOperator?.id && op.active) ||
      p.assignees?.some(a => a.id === activeOperator?.id)
    );
    
    return assigned;
  }, [profiles, activeOperator?.id, activeOperator?.role?.isManager, activeRole]);

  const myProfileIds = useMemo(() => myProfiles.map(p => p.id), [myProfiles]);

  const filteredProfiles = useMemo(() => {
    if (activeRole === 'App Owner') return profiles;
    if (activeRole === 'Agency Manager' || activeRole === 'Agency Admin' || activeRole === 'Senior Operator') {
      return profiles.filter(p => p.agencyId === activeOperator?.agencyId);
    }
    return profiles.filter(p => 
      p.operators?.some(o => o.id === activeOperator?.id) || 
      p.assignees?.some(a => a.id === activeOperator?.id)
    );
  }, [profiles, activeOperator?.agencyId, activeOperator?.id, activeRole]);

  const allAgencyProfiles = useMemo(() =>
    activeRole === 'App Owner' ? profiles : profiles.filter(p => p.agencyId === activeOperator?.agencyId),
    [profiles, activeOperator?.agencyId, activeRole]
  );

  const activeProfile = useMemo(() =>
    profiles.find(p => p.id === activeProfileId) || allAgencyProfiles[0],
    [profiles, activeProfileId, allAgencyProfiles]
  );

  const assignedProfiles = useMemo(() => {
    // For Agency Manager/Senior Operator, show all profiles in the agency
    if (activeRole === 'Agency Manager' || activeRole === 'Agency Admin' || activeRole === 'Senior Operator') {
      return profiles.filter(p => p.agencyId === activeOperator?.agencyId);
    }
    // For operators, show only their assigned models
    return profiles.filter(p => 
      p.operators?.some(o => o.id === activeOperator?.id) || 
      p.assignees?.some(a => a.id === activeOperator?.id)
    );
  }, [profiles, activeRole, activeOperator]);

  useEffect(() => {
    const candidateProfiles = activeOperator?.isModel
      ? profiles.filter(p => normalizeProfileId(p.id) === normalizeProfileId(activeOperator?.profileId))
      : assignedProfiles;

    if (!candidateProfiles.length) {
      return;
    }

    const normalizedCurrent = normalizeProfileId(activeProfileId);
    const hasCurrentProfile = candidateProfiles.some(profile => normalizeProfileId(profile.id) === normalizedCurrent);

    if (!hasCurrentProfile) {
      setActiveProfileId(normalizeProfileId(candidateProfiles[0].id));
    }
  }, [activeOperator?.isModel, activeOperator?.profileId, activeProfileId, assignedProfiles, normalizeProfileId, profiles]);

  const filteredMessages = useMemo(() => {
    const toTimestamp = (message) => {
      const raw = message?.timestamp || message?.lastMessageAt || message?.createdAt;
      const ts = raw ? new Date(raw).getTime() : 0;
      return Number.isFinite(ts) ? ts : 0;
    };

    const effectiveActiveProfileId = normalizeProfileId(activeProfileId ?? activeProfile?.id ?? assignedProfiles[0]?.id ?? activeOperator?.profileId ?? null);
    const base = messages.filter(m => normalizeProfileId(m.profileId) === effectiveActiveProfileId);
    return [...base].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  }, [messages, activeProfileId, activeOperator?.profileId, activeProfile?.id, assignedProfiles, normalizeProfileId]);

  const selectedChat = useMemo(() => {
    if (!selectedChatId) return filteredMessages[0] || null;
    return filteredMessages.find(m => String(m.id) === String(selectedChatId)) || filteredMessages[0] || null;
  }, [filteredMessages, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId && filteredMessages.length > 0) {
      setSelectedChatId(filteredMessages[0].id);
    }
  }, [filteredMessages, selectedChatId, setSelectedChatId]);

  useEffect(() => {
    if (selectedChatId == null) {
      localStorage.removeItem('nexus_lastSelectedChatId');
      return;
    }
    localStorage.setItem('nexus_lastSelectedChatId', String(selectedChatId));
  }, [selectedChatId]);

  const currentAgency = useMemo(() => agencies.find(a => a.id === activeClient?.id) || agencies[0], [activeClient, agencies]);


  const handleSendMessage = async (text) => {
    const targetChatId = selectedChatId || selectedChat?.id;
    console.log('[Chat] Sending message:', { targetChatId, text });
    if (!text?.trim() || !targetChatId) {
      console.warn('[Chat] Aborting send: missing text or chat ID');
      return;
    }
    
    try {
      const res = await axios.post(`${API_BASE}/messages`, {
        chatId: targetChatId,
        text: text.trim(),
        direction: 'OUTBOUND',
        transport: 'sms'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setMessageValue('');
        // Do NOT add optimistically here — socket new_message event handles it
        // with proper dedup logic. Adding here causes race condition duplicates.
      }
    } catch (error) {
      console.error('Send message error:', error);
      addNotification({
        title: t('sendError') || 'Error',
        message: t('sendErrorMessage') || 'Could not send message. Please check the relay device.',
        type: 'error'
      });
    }
  };

  const toggleOperatorStatus = (profileId, operatorId) => {
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          operators: p.operators.map(op => 
            op.id === operatorId ? { ...op, active: !op.active } : op
          )
        };
      }
      return p;
    }));
  };

  const handleEditProfile = (profile) => {
    setEditingProfileData({ ...profile });
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = useCallback(async () => {
    if (!editingProfileData) return;
    try {
      await axios.patch(`${API_BASE}/profiles/${editingProfileData.id}`, {
        name: editingProfileData.name,
        phone: editingProfileData.phone,
        quickReplies: editingProfileData.quickReplies || []
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.warn('[Profile] Backend save failed, localStorage fallback:', e.message);
      localStorage.setItem(`nexus_quick_replies_${editingProfileData.id}`, JSON.stringify(editingProfileData.quickReplies || []));
    }
    setProfiles(prev => prev.map(p =>
      p.id === editingProfileData.id ? { ...p, ...editingProfileData } : p
    ));
    setIsEditProfileModalOpen(false);
    setEditingProfileData(null);
  }, [editingProfileData, API_BASE, token]);

  // Auto-fetch notes from DB when opening a chat
  useEffect(() => {
    if (!selectedChat?.from || !activeProfileId || !token) return;
    const phone = selectedChat.from;
    if (clientNotes[phone]) return; // already loaded for this chat
    axios.get(`${API_BASE}/notes/${encodeURIComponent(phone)}?profileId=${activeProfileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setClientNotes(prev => ({ ...prev, [phone]: res.data }));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.from, activeProfileId, token]);

  const handleSaveNote = useCallback(async () => {
    if (!internalNote.trim() || !selectedChat?.from || !activeProfileId) return;
    try {
      const res = await axios.post(`${API_BASE}/notes`, {
        clientPhone: selectedChat.from,
        text: internalNote,
        profileId: activeProfileId,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setClientNotes(prev => ({
        ...prev,
        [selectedChat.from]: [res.data, ...(prev[selectedChat.from] || [])]
      }));
      setInternalNote('');
    } catch (err) {
      console.error('[Notes] save error:', err.message);
    }
  }, [internalNote, selectedChat, activeProfileId, API_BASE, token]);


  // ── Booking API integration ─────────────────────────────────────────────────
  const fetchBookings = useCallback(async (profileId) => {
    if (!token || !profileId) return;
    try {
      const res = await axios.get(`${API_BASE}/bookings?profileId=${profileId}`, { headers: { Authorization: `Bearer ${token}` } });
      const profileName = profiles.find(p => p.id === profileId)?.name || '';
      const formatted = (res.data || []).map(b => {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);
        const h = start.getHours() % 12 || 12;
        const m = start.getMinutes().toString().padStart(2, '0');
        const ampm = start.getHours() >= 12 ? 'PM' : 'AM';
        const durMin = Math.round((end - start) / 60000);
        return {
          id: b.id, time: `${h}:${m} ${ampm}`,
          duration: durMin >= 60 ? `${Math.floor(durMin/60)}h${durMin%60>0?' '+durMin%60+'m':''}` : `${durMin}m`,
          type: 'work', title: b.title, status: b.status,
          startTime: b.startTime, endTime: b.endTime,
          profileId, profileName
        };
      });
      setBookingSchedule(formatted);
    } catch (e) { console.error('[Booking] fetch error:', e.message); }
  }, [token, API_BASE, profiles]);

  const handleQuickSaveMeeting = useCallback(async () => {
    if (!detectedMeeting || !activeProfileId) return;
    try {
      const hMatch = detectedMeeting.time.match(/(\d{1,2})[:\.]?(\d{2})?/);
      const ampm = detectedMeeting.time.toLowerCase().includes('pm') ? 'PM' : 'AM';
      let hh = hMatch ? parseInt(hMatch[1]) : 12;
      const mm = hMatch?.[2] || '00';
      
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;

      const dateStr = detectedMeeting.date || new Date().toISOString().split('T')[0];
      const startTime = new Date(`${dateStr}T${String(hh).padStart(2,'0')}:${mm}:00`).toISOString();
      const durationHours = parseFloat(detectedMeeting.duration || '1');
      const endTime = new Date(new Date(startTime).getTime() + durationHours * 3600000).toISOString();

      await axios.post(`${API_BASE}/bookings`, 
        { profileId: activeProfileId, title: `${selectedChat?.from || 'Client'}`, startTime, endTime, locationType: 'incall' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDetectedMeeting(null);
      showToast(lang === 'cz' ? 'Schůzka uložena ✓' : 'Meeting saved ✓', 'success');
      await fetchBookings(activeProfileId);
    } catch (e) {
      console.error('[Booking] Direct save error:', e.message);
      setIsBookingModalOpen(true); // Fallback to modal on error
    }
  }, [detectedMeeting, activeProfileId, selectedChat, API_BASE, token, lang, fetchBookings]);

  const handleCreateBooking = useCallback(async () => {
    if (!newBookingForm.title || !newBookingForm.date || !activeProfileId) return;
    try {
      const startTime = new Date(`${newBookingForm.date}T${newBookingForm.startTime}:00`).toISOString();
      const endTime = new Date(`${newBookingForm.date}T${newBookingForm.endTime}:00`).toISOString();
      await axios.post(`${API_BASE}/bookings`, { 
        profileId: activeProfileId, 
        title: newBookingForm.title, 
        startTime, 
        endTime,
        locationType: newBookingForm.locationType || 'incall'
      },
        { headers: { Authorization: `Bearer ${token}` } });
      setIsBookingModalOpen(false);
      setNewBookingForm({ title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', locationType: 'incall' });
      await fetchBookings(activeProfileId);
    } catch (e) { console.error('[Booking] create error:', e.message); }
  }, [newBookingForm, activeProfileId, API_BASE, token, fetchBookings]);

  const handleSaveBio = useCallback(async () => {
    if (!activeProfile?.id || !token) return;
    try {
      await axios.patch(`${API_BASE}/profiles/${activeProfile.id}`, {
        bio: mottoText || activeProfile?.bio || '',
        description: bioText
      }, { headers: { Authorization: `Bearer ${token}` } });
      setProfiles(prev => prev.map(p => p.id === activeProfile.id ? { ...p, bio: mottoText, description: bioText } : p));
      alert(lang === 'cz' ? 'Bio uloženo ✓' : 'Bio saved ✓');
    } catch (e) {
      console.error('[Bio] save error:', e.message);
      alert(lang === 'cz' ? 'Chyba při ukládání' : 'Save failed');
    }
  }, [activeProfile, mottoText, bioText, API_BASE, token, lang]);

  const handleSaveCalendarSync = useCallback(async () => {
    if (!calendarSyncUrl.trim()) return;
    try {
      await axios.post(`${API_BASE}/calendar/sync`, { url: calendarSyncUrl, profileId: activeProfileId },
        { headers: { Authorization: `Bearer ${token}` } });
      alert(lang === 'cz' ? 'Kalendář synchronizován ✓' : 'Calendar synced ✓');
      if (activeProfileId) fetchBookings(activeProfileId);
    } catch (e) {
      // Store URL locally even if API fails
      localStorage.setItem(`nexus_cal_sync_${activeProfileId}`, calendarSyncUrl);
      alert(lang === 'cz' ? 'URL uložena lokálně ✓' : 'URL saved locally ✓');
    }
  }, [calendarSyncUrl, API_BASE, token, activeProfileId, fetchBookings, lang]);

  const handleDeleteBooking = useCallback(async (bookingId) => {
    if (!bookingId || !token) return;
    try {
      await axios.delete(`${API_BASE}/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      setBookingSchedule(prev => prev.filter(b => b.id !== bookingId));
      setOpenBookingMenuId(null);
    } catch (e) { console.error('[Booking] delete error:', e.message); }
  }, [API_BASE, token]);

  const handleEditBooking = useCallback((event) => {
    setNewBookingForm({
      title: event.title || '',
      date: event.startTime ? event.startTime.split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: event.startTime ? new Date(event.startTime).toTimeString().slice(0,5) : event.time?.slice(0,5) || '10:00',
      endTime: event.endTime ? new Date(event.endTime).toTimeString().slice(0,5) : '11:00',
      editId: event.id
    });
    setOpenBookingMenuId(null);
    setIsBookingModalOpen(true);
  }, []);

  useEffect(() => {
    if (activeProfileId && token) fetchBookings(activeProfileId);
  }, [activeProfileId, token, fetchBookings]);


  const handleDeleteNote = useCallback(async (from, noteId) => {
    try {
      await axios.delete(`${API_BASE}/notes/${noteId}`, { headers: { Authorization: `Bearer ${token}` } });
      setClientNotes(prev => ({
        ...prev,
        [from]: (prev[from] || []).filter(n => n.id !== noteId)
      }));
    } catch (err) {
      console.error('[Notes] delete error:', err.message);
    }
  }, [API_BASE, token]);


  const totalUnread = useMemo(() =>
    messages?.filter(msg =>
      msg && (activeOperator?.isModel ? msg.profileId === 'p-04' : myProfileIds.includes(msg.profileId)) &&
      msg.status === 'unread'
    ).length || 0,
    [messages, myProfileIds, activeOperator]
  );

  const getUnreadForProfile = (profileId) => {
    return messages.filter(msg => msg.profileId === profileId && msg.status === 'unread').length;
  };

  const startCall = useCallback(() => {
    if (!activeProfile) return;
    setActiveCall({ status: 'connecting', startTime: Date.now(), caller: selectedChat?.from || activeProfile?.name || 'Unknown' });
    setTimeout(() => {
      setActiveCall({ status: 'active', startTime: Date.now(), caller: selectedChat?.from || activeProfile?.name || 'Unknown' });
    }, 2000);
  }, [activeProfile, selectedChat]);

  const simulateIncomingCall = useCallback(() => {
    const randomProfile = myProfiles[Math.floor(Math.random() * myProfiles.length)] || profiles[0];
    setIncomingCall({
      profileId: randomProfile.id,
      profileName: randomProfile.name,
      caller: '+44 7700 900' + Math.floor(100 + Math.random() * 900)
    });
  }, [myProfiles, profiles]);

  const acceptCall = useCallback(() => {
    const caller = incomingCall.caller;
    setIncomingCall(null);
    setActiveCall({ status: 'active', startTime: Date.now(), caller });
  }, [incomingCall]);

  const endCall = useCallback(() => setActiveCall(null), []);
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSyncAll = useCallback(() => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus({ aw: 'syncing', ege: 'syncing', tpb: 'syncing' });
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setSyncProgress(p);
      if (p === 40) setSyncStatus(s => ({ ...s, aw: 'synced' }));
      if (p === 75) setSyncStatus(s => ({ ...s, tpb: 'synced' }));
      if (p >= 100) {
        clearInterval(interval);
        setIsSyncing(false);
        setSyncStatus({ aw: 'synced', ege: 'synced', tpb: 'synced' });
      }
    }, 150);
  }, []);

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => {
      setTranslatedText(`[${t('poweredByAi')}]: ${sourceText}`);
      setIsTranslating(false);
    }, 1200);
  }, [sourceText, t]);

  const handleConfirmBooking = useCallback(() => {
    const newEvent = {
        title: newBookingForm.title || `Private Booking - ${selectedChat?.from || 'Client'}`,
        date: newBookingForm.date,
        startTime: newBookingForm.startTime,
        endTime: newBookingForm.endTime,
        locationType: newBookingForm.locationType,
        status: 'busy'
    };
    setBookingSchedule(prev => [...prev, newEvent]);
    setIsBookingModalOpen(false);
  }, [newBookingForm, selectedChat, bookingSchedule]);

  const handleExportICS = useCallback(() => {
    const events = bookingSchedule.map(event => {
      // Basic ICS format construction
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const start = new Date().toISOString().split('T')[0].replace(/-/g, '') + 'T' + event.time.replace(/[:\s]/g, '') + '00';
      return [
        'BEGIN:VEVENT',
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.duration} session`,
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NexusSync Systems//Calendar//EN',
      events,
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `schedule_${activeProfile?.name || 'nexus'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [bookingSchedule, activeProfile]);



  const handleResetRequired = useCallback((user) => {
    setTempUser(user);
    setShowResetPassword(true);
  }, []);

  const handleResetComplete = useCallback((newPassword) => {
    if (!tempUser) return;
    
    // Update operators state with new password and clear flag
    const updatedOperators = operators.map(op => 
      op.id === tempUser.id ? { ...op, password: newPassword, mustResetPassword: false } : op
    );
    setOperators(updatedOperators);
    
    // Auto login after reset
    const updatedUser = updatedOperators.find(op => op.id === tempUser.id);
    handleLogin(updatedUser);
    
    setShowResetPassword(false);
    setTempUser(null);
  }, [tempUser, operators, handleLogin]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setShowLanding(true);
    setActiveProfileId(null);
    setSelectedChatId(null);
    setIsRelayMode(false);
    localStorage.removeItem('nexus_isLoggedIn');
    localStorage.removeItem('nexus_activeOperator');
    localStorage.removeItem('nexus_activeClient');
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_lastSelectedChatId');
    localStorage.removeItem('nexus_relay_mode'); // Reset so next login auto-activates relay again
    setToken(null);
  }, []);

  useEffect(() => {
    if (!isNativeApp || !isLoggedIn) {
      backgroundedAtRef.current = null;
      return undefined;
    }

    let listener = null;
    let cancelled = false;

    const setupAppStateLock = async () => {
      listener = await CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        if (!isLoggedIn) return;

        if (!isActive) {
          backgroundedAtRef.current = Date.now();
          return;
        }

        const pausedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (!pausedAt) return;
        if ((Date.now() - pausedAt) < APP_LOCK_TIMEOUT_MS) return;
        if (unlockInProgressRef.current) return;

        unlockInProgressRef.current = true;
        const unlocked = await requestSystemUnlock();
        unlockInProgressRef.current = false;

        if (!unlocked && !cancelled) {
          // Secure fallback when system lock is unavailable or cancelled.
          handleLogout();
        }
      });
    };

    void setupAppStateLock();

    return () => {
      cancelled = true;
      if (listener?.remove) {
        void listener.remove();
      }
    };
  }, [isNativeApp, isLoggedIn, handleLogout, requestSystemUnlock]);

  // Main UI logic
  const renderNotificationPanel = () => {
    if (!notificationPanelOpen) return null;
    return (
      <>
        {/* Backdrop for closing */}
        <div 
          onClick={() => setNotificationPanelOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1199 }}
        />
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: isMobile ? 'min(400px, 100vw)' : '400px', maxWidth: '100vw', background: 'rgba(5, 7, 10, 0.95)', borderLeft: '1px solid var(--card-border)', zIndex: 1200, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(30px)', animation: 'slideInRight 0.3s cubic-bezier(0, 0, 0.2, 1)' }}>
          <div style={{ padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 1.5rem) 1.5rem 1.5rem' : '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{t('notifications')}</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>{t('clearAll')}</button>
              <button 
                onClick={() => setNotificationPanelOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? `1rem 1rem calc(env(safe-area-inset-bottom, 0px) + 1rem)` : '1rem' }} className="custom-scrollbar">
            {(() => {
              const filteredNotifications = notifications.filter(n => {
                if (activeOperator?.isModel) {
                  return n.profileId === activeOperator.profileId;
                }
                return true;
              });

              if (filteredNotifications.length === 0) {
                return (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {t('noNotifications')}
                  </div>
                );
              }

              return filteredNotifications.map(n => {
                const isInteractive = hasNotificationTarget(n);
                return (
                <div key={n.id} style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid var(--card-border)',
                  marginBottom: '1rem',
                  position: 'relative',
                  borderLeft: `4px solid ${
                    n.type === 'emergency' ? 'var(--error-color)' :
                    n.type === 'success' ? 'var(--success-color)' :
                    n.type === 'warning' ? 'var(--warning-color)' : 'var(--accent-color)'
                  }`,
                  cursor: isInteractive ? 'pointer' : 'default'
                }}
                  onClick={isInteractive ? () => handleNotificationClick(n) : () => markNotificationRead(n.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (isInteractive) {
                        handleNotificationClick(n);
                      } else {
                        markNotificationRead(n.id);
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)' }}>{n.timestamp}</span>
                    {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)' }}></div>}
                  </div>
                  {n.title && <div style={{ fontSize: '0.72rem', fontWeight: '900', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{n.title}</div>}
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{n.message || n.msg}</div>
                  {isInteractive && <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: '800' }}>Open related chat</div>}
                </div>
              )});
            })()}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid var(--card-border)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800' }}>
                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success-color)', animation: 'pulse 2s infinite' }}></div>
                 78.141.202.139:3001
               </div>
               <button 
                 onClick={() => setIsSimulating(!isSimulating)}
                 style={{ 
                   padding: '4px 10px', 
                   borderRadius: '6px', 
                   border: '1px solid var(--card-border)', 
                   background: isSimulating ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                   color: isSimulating ? 'var(--accent-color)' : 'var(--text-secondary)',
                   fontSize: '0.65rem',
                   fontWeight: '800',
                   cursor: 'pointer'
                 }}
               >
                 {isSimulating ? 'SIMULATION: ON' : 'SIMULATION: OFF'}
               </button>
            </div>
          </div>
        </div>
      </>
  );
};

  const handleRegisterAgency = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register-agency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return true;
      const err = await res.json();
      throw new Error(err.message);
    } catch (err) {
      console.error('[Auth] Registration failed:', err);
      throw err;
    }
  };

  const handleRegisterUser = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return true;
      const err = await res.json();
      throw new Error(err.message);
    } catch (err) {
      console.error('[Auth] User registration failed:', err);
      throw err;
    }
  };

  const handleResetRequest = async (email) => {
    try {
      await fetch(`${API_BASE}/auth/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return true;
    } catch (err) {
      console.error('[Auth] Reset request failed:', err);
      return false;
    }
  };

  const handleNavigation = useCallback((nextTab) => {
    if (nextTab === 'inbox') {
      const selectedInProfile = filteredMessages.find(m => String(m.id) === String(selectedChatId));
      const targetChatId = selectedInProfile?.id ?? filteredMessages[0]?.id ?? selectedChatId ?? null;

      setActiveTab('inbox');
      if (isMobile) {
        if (targetChatId != null) {
          setSelectedChatId(targetChatId);
          setMobileView('chat');
        } else {
          setSelectedChatId(null);
          setMobileView('list');
        }
      }
      setIsMobileMenuOpen(false);
      return;
    }

    setActiveTab(nextTab);
    if (isMobile) setIsMobileMenuOpen(false);
  }, [filteredMessages, isMobile, selectedChatId]);

  const handleMobileProfileSelection = useCallback((profileId) => {
    setActiveProfileId(profileId);
    setActiveTab('inbox');
    const firstUnread = messages.find(m => m.profileId === profileId && m.status === 'unread');
    if (firstUnread) {
      setSelectedChatId(firstUnread.id);
      setMobileView('chat');
    } else {
      setSelectedChatId(null);
      setMobileView('list');
    }
    setIsMobileMenuOpen(false);
  }, [messages]);

  const primaryNavItems = useMemo(() => ([
    { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeOperator?.isModel ? 0 : totalUnread, perm: 'messaging' },
    { id: 'calendar', icon: Calendar, label: t('schedule'), badge: 0, perm: 'calendar' },
  ].filter(item => (rolePermissions[activeRole] || {})[item.perm])), [t, rolePermissions, activeRole, activeOperator?.isModel, totalUnread]);

  const toolNavItems = useMemo(() => ([
    { id: 'infra', icon: HardDrive, label: t('infra'), perm: 'infrastructure' },
    { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
    { id: 'permissions', icon: Shield, label: t('permissions'), perm: 'permissions' },
    { id: 'plans', icon: CreditCard, label: t('plans'), perm: 'plans' },
    { id: 'features', icon: Zap, label: t('features'), perm: 'global_features' },
    { id: 'inventory', icon: Package, label: t('stockCard') || 'Sklad', perm: 'inventory' },
    { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
    { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
    { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
    { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
    { id: 'activity', icon: Activity, label: t('auditLog'), perm: 'audit_logs' },
    { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
    { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
  ].filter(item => (rolePermissions[activeRole] || {})[item.perm])), [t, rolePermissions, activeRole]);

  const shouldShowAssignedProfiles = activeRole !== 'Model' && activeRole !== 'App Owner' && activeRole !== 'Agency Admin';

  const renderMobileDrawerButton = (item, { nested = false } = {}) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.id)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: nested ? '0.8rem 1rem 0.8rem 1.15rem' : '0.95rem 1rem',
          borderRadius: '16px',
          border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255,255,255,0.06)',
          background: isActive ? 'rgba(59, 130, 246, 0.14)' : 'rgba(255,255,255,0.03)',
          color: 'white',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <Icon size={nested ? 18 : 20} color={isActive ? 'var(--accent-color)' : 'rgba(255,255,255,0.72)'} />
          <span style={{ fontWeight: isActive ? '800' : '600', fontSize: nested ? '0.9rem' : '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
        </span>
        {!!item.badge && (
          <span style={{ minWidth: '22px', height: '22px', borderRadius: '999px', padding: '0 0.5rem', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '900' }}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderMobileHeader = () => {
    // Keep app header always visible on mobile.

    return (
      <header className="mobile-app-header" style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: '0.3rem',
        paddingLeft: '0.75rem',
        paddingRight: '0.75rem',
        display: 'flex',
        alignItems: 'center', 
        background: 'rgba(7, 10, 15, 0.95)',
        backdropFilter: 'blur(25px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1000,
        height: 'auto',
        minHeight: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
          <img src="/nexus_icon.png" alt="Nexus Hub" style={{ width: '18px', height: '18px', borderRadius: '5px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.05, fontWeight: '900', color: 'white' }}>Nexus Hub</div>
            <div style={{ fontSize: '0.42rem', lineHeight: 1, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', fontWeight: '800' }}>{activeRole?.toUpperCase() || 'SYSTEM'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {/* Universal SOS Button in Top Bar */}
          {(activeOperator?.isModel || (isMobile && activeOperator && !activeOperator?.isAppOwner && !activeOperator?.isAdmin && !activeOperator?.isManager)) && (
            <button 
              onClick={() => setShowPanicConfirm(true)}
              style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Shield size={15} />
            </button>
          )}

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '1px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setLang('cz')} style={{ padding: '3px 5px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '5px', fontSize: '0.45rem', fontWeight: '900', cursor: 'pointer' }}>CZ</button>
            <button onClick={() => setLang('en')} style={{ padding: '3px 5px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '5px', fontSize: '0.45rem', fontWeight: '900', cursor: 'pointer' }}>EN</button>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Menu size={15} />
          </button>
        </div>
      </header>
    );
  };


  const renderContent = () => {
    if (isRelayMode) {
      return (
        <RelayMode 
          operator={activeOperator} 
          t={t} 
          onHide={() => {
            setIsRelayMode(false);
          }}
          onExit={() => {
            // User explicitly exits relay – remember this so auto-relay won't re-activate on next startup
            localStorage.setItem('nexus_relay_mode', 'false');
            setIsRelayMode(false);
          }}
          syncPushToken={syncPushToken}
          isSyncingPush={isSyncingPush}
          requestRelayPermissions={requestRelayPermissions}
          processRelayOutbox={processRelayOutbox}
          syncSmsHistory={syncSmsHistory}
        />
      );
    }

    if (!isLoggedIn) {
      if (showOnboarding) {
        return (
          <Onboarding
            onComplete={handleOnboardingComplete}
            lang={lang}
          />
        );
      }
      if (showLanding) {
        return (
          <LandingPage 
            onLoginClick={() => setShowLanding(false)} 
            lang={lang} 
            setLang={setLang} 
            isMobile={isMobile}
          />
        );
      }
      if (showResetPassword) {
        return <ResetPasswordView onComplete={handleResetComplete} t={t} />;
      }
      return (
        <LoginScreen 
          onLogin={handleLogin} 
          onRegisterAgency={handleRegisterAgency}
          onRegisterUser={handleRegisterUser}
          onResetRequest={handleResetRequest}
          onBackToLanding={isNativeApp ? null : () => setShowLanding(true)}
          operators={operators}
          lang={lang} 
          setLang={setLang} 
          t={t} 
          isMobile={isMobile}
        />
      );
    }
    
    // Authenticated UI - Special Relay Variant
    if (appVariant === 'relay') {
      return (
        <div style={{ 
          height: '100dvh', 
          width: '100dvw', 
          backgroundColor: 'var(--bg-color)', 
          color: 'var(--text-primary)',
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <main style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            paddingBottom: '70px'
          }}>
            {activeTab === 'dashboard' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <DashboardHome
                  t={t}
                  activeOperator={activeOperator}
                  activeRole={activeRole}
                  profiles={profiles}
                  operators={operators}
                  agencies={agencies}
                  isMobile={true}
                  isRelayVariant={true}
                  token={token}
                  API_BASE={API_BASE}
                />
              </div>
            )}
            
            <OperationsUnit
              activeTab={activeTab}
              isMobile={true}
              t={t}
              lang={lang}
              token={token}
              activeOperator={activeOperator}
              activeRole={activeRole}
              activeProfileId={activeProfileId}
              setActiveProfileId={setActiveProfileId}
              allAgencyProfiles={allAgencyProfiles}
              myProfiles={myProfiles}
              profiles={profiles}
              setProfiles={setProfiles}
              operators={operators}
              assignedProfiles={assignedProfiles}
              showToast={showToast}
              API_BASE={API_BASE}
              contacts={contacts}
              setContacts={setContacts}
              activeContactId={activeContactId}
              setActiveContactId={setActiveContactId}
              messages={messages}
              setMessages={setMessages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              handleRefreshMessages={handleRefreshMessages}
              isDrafting={isDrafting}
              setIsDrafting={setIsDrafting}
              setIsBookingModalOpen={setIsBookingModalOpen}
              handleExportICS={handleExportICS}
              isCalendarSyncOpen={isCalendarSyncOpen}
              setIsCalendarSyncOpen={setIsCalendarSyncOpen}
              calendarSyncUrl={calendarSyncUrl}
              setCalendarSyncUrl={setCalendarSyncUrl}
              handleSaveCalendarSync={handleSaveCalendarSync}
              bookingSchedule={bookingSchedule}
              activeTimerEvent={activeTimerEvent}
              isTimerActive={isTimerActive}
              openBookingMenuId={openBookingMenuId}
              setOpenBookingMenuId={setOpenBookingMenuId}
              handleCheckIn={handleCheckIn}
              handleCheckOut={handleCheckOut}
              handleEditBooking={handleEditBooking}
              handleDeleteBooking={handleDeleteBooking}
              timeLeft={timeLeft}
              formatSafetyTime={formatSafetyTime}
              isSafetyLoading={isSafetyLoading}
              handleSafetyImOk={handleSafetyImOk}
              SAFETY_SUGGESTIONS={SAFETY_SUGGESTIONS}
              setSelectedScheduleEvent={setSelectedScheduleEvent}
              bioText={bioText}
              setBioText={setBioText}
              handleSaveBio={handleSaveBio}
              isSyncing={isSyncing}
              syncStatus={syncStatus}
              syncProgress={syncProgress}
              handleSyncAll={handleSyncAll}
              relayApkInfo={relayApkInfo}
              setRelayApkInfo={setRelayApkInfo}
              clientNotes={clientNotes}
              clientNames={clientNames}
              updateClientName={updateClientName}
              assigningProfile={assigningProfile}
              setAssigningProfile={setAssigningProfile}
              setActiveTab={setActiveTab}
              toggleOperatorStatus={toggleOperatorStatus}
              handleEditProfile={handleEditProfile}
              handleSaveAssignees={handleSaveAssignees}
            />
          </main>

          <MobileBottomNav 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            t={t} 
            unreadCount={0} 
          />
        </div>
      );
    }

    // Default Authenticated UI (Full Hub)
    return (
      <div className="mobile-container" style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        minHeight: '100dvh',
        height: '100vh',
        width: '100%',
        maxWidth: '100%', 
        overflow: 'hidden',
        background: 'var(--bg-color)',
        color: 'white', 
        position: 'relative' 
      }}>
        {/* ... child content remains here, we just moved the return into this function ... */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 768px) {
            .desktop-sidebar {
              position: fixed !important;
              left: 0;
              top: 0;
              height: 100dvh;
              width: 100% !important;
              max-width: 100% !important;
              z-index: 10000 !important;
              background: rgba(8, 10, 15, 0.98) !important;
              backdrop-filter: blur(50px) saturate(180%) !important;
              -webkit-backdrop-filter: blur(50px) saturate(180%) !important;
              padding: 0 !important;
              display: flex;
              flex-direction: column;
              border-right: none !important;
            }
            .main-content {
              margin-left: 0 !important;
              padding-top: 0 !important;
              padding-bottom: calc(3.5rem + max(env(safe-area-inset-bottom, 0px), 0px)) !important;
              flex: 1 1 0% !important;
              min-height: 0 !important;
              height: 0 !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
            }
            .mobile-app-header {
              position: relative !important;
              top: auto !important;
              flex-shrink: 0 !important;
            }
            .mobile-container {
              height: 100dvh !important;
              overflow: hidden !important;
            }
          }
        ` }} />

      {isMobile && renderMobileHeader()}

      {/* Overlay for mobile sidebar */}
      {isMobile && isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9499 }}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobile={isMobile}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          activeOperator={activeOperator}
          activeRole={activeRole}
          isAllowed={isAllowed}
          t={t}
          lang={lang}
          setLang={setLang}
          totalUnread={totalUnread}
          rolePermissions={rolePermissions}
          handleNavigation={handleNavigation}
          handleLogout={handleLogout}
          myProfiles={myProfiles}
          showOnlyOnline={showOnlyOnline}
          setShowOnlyOnline={setShowOnlyOnline}
          getUnreadForProfile={getUnreadForProfile}
          setActiveProfileId={setActiveProfileId}
          messages={messages}
          setSelectedChatId={setSelectedChatId}
          setMobileView={setMobileView}
          setIsRelayMode={setIsRelayMode}
          setNotificationPanelOpen={setNotificationPanelOpen}
      />

      {/* Main Area */}
      <main className="main-content custom-scrollbar" style={{
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0,
        height: 0,
        minWidth: 0,
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 0,
        paddingBottom: isMobile ? 'calc(3.5rem + max(env(safe-area-inset-bottom), 0px))' : '0',
        position: 'relative',
        background: 'var(--bg-color)',
      }}>
        {/* Exit Impersonation Banner */}
        {originalOperator && activeRole !== 'App Owner' && (
          <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))', border: '1px solid rgba(245,158,11,0.4)', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700' }}>👁️ Prohlížíte jako: <strong>{activeOperator?.name || activeClient?.name}</strong> ({activeClient?.name})</div>
            <button
              onClick={() => { setActiveOperator(originalOperator); setActiveClient(null); setOriginalOperator(null); setActiveTab('agency-management'); }}
              style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ← Zpět jako App Owner
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardHome 
            user={activeOperator} 
            translatedText={translatedText}
            internalNote={internalNote}
            setInternalNote={setInternalNote}
            clientNotes={clientNotes}
            clientNames={clientNames}
            filteredMessages={filteredMessages}
            selectedChat={selectedChat}
            chatMessages={chatMessages}
            isHistoryLoading={isHistoryLoading}
            chatScrollRef={chatScrollRef}
            isUserScrolled={isUserScrolled}
            typingProfiles={typingProfiles}
            inlinePanelTab={inlinePanelTab}
            setInlinePanelTab={setInlinePanelTab}
            activeOperator={activeOperator}
            setShowPanicConfirm={setShowPanicConfirm}
            detectedMeeting={detectedMeeting}
            setDetectedMeeting={setDetectedMeeting}
            messageValue={messageValue}
            setMessageValue={setMessageValue}
            bookingSchedule={bookingSchedule}
            calViewDate={calViewDate}
            setCalViewDate={setCalViewDate}
            setIsBookingModalOpen={setIsBookingModalOpen}
            setNewBookingForm={setNewBookingForm}
            activeContextTab={activeContextTab}
            setActiveContextTab={setActiveContextTab}
            lang={lang}
            t={t}
            activeProfile={activeProfile}
            handleSendMessage={handleSendMessage}
            handleTranslate={handleTranslate}
            handleSaveNote={handleSaveNote}
            handleDeleteNote={handleDeleteNote}
            startCall={startCall}
            handleQuickSaveMeeting={handleQuickSaveMeeting}
          />
        )}

        {/* UNIT: OPERATIONS */}
        <OperationsUnit
          activeTab={activeTab}
          isMobile={isMobile}
          t={t}
          lang={lang}
          token={localStorage.getItem('nexus_token')}
          activeOperator={activeOperator}
          activeRole={activeRole}
          activeProfileId={activeProfileId}
          setActiveProfileId={setActiveProfileId}
          allAgencyProfiles={allAgencyProfiles}
          myProfiles={myProfiles}
          profiles={profiles}
          setProfiles={setProfiles}
          operators={operators}
          assignedProfiles={assignedProfiles}
          showToast={showToast}
          API_BASE={API_BASE}
          contacts={contacts}
          setContacts={setContacts}
          activeContactId={activeContactId}
          setActiveContactId={setActiveContactId}
          messages={messages}
          setMessages={setMessages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleRefreshMessages={handleRefreshMessages}
          isDrafting={isDrafting}
          setIsDrafting={setIsDrafting}
          setIsBookingModalOpen={setIsBookingModalOpen}
          handleExportICS={handleExportICS}
          isCalendarSyncOpen={isCalendarSyncOpen}
          setIsCalendarSyncOpen={setIsCalendarSyncOpen}
          calendarSyncUrl={calendarSyncUrl}
          setCalendarSyncUrl={setCalendarSyncUrl}
          handleSaveCalendarSync={handleSaveCalendarSync}
          bookingSchedule={bookingSchedule}
          activeTimerEvent={activeTimerEvent}
          isTimerActive={isTimerActive}
          openBookingMenuId={openBookingMenuId}
          setOpenBookingMenuId={setOpenBookingMenuId}
          handleCheckIn={handleCheckIn}
          handleCheckOut={handleCheckOut}
          handleEditBooking={handleEditBooking}
          handleDeleteBooking={handleDeleteBooking}
          timeLeft={timeLeft}
          formatSafetyTime={formatSafetyTime}
          isSafetyLoading={isSafetyLoading}
          handleSafetyImOk={handleSafetyImOk}
          SAFETY_SUGGESTIONS={SAFETY_SUGGESTIONS}
          setSelectedScheduleEvent={setSelectedScheduleEvent}
          bioText={bioText}
          setBioText={setBioText}
          handleSaveBio={handleSaveBio}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          syncProgress={syncProgress}
          handleSyncAll={handleSyncAll}
          relayApkInfo={relayApkInfo}
          setRelayApkInfo={setRelayApkInfo}
          clientNotes={clientNotes}
          clientNames={clientNames}
          updateClientName={updateClientName}
          assigningProfile={assigningProfile}
          setAssigningProfile={setAssigningProfile}
          setActiveTab={setActiveTab}
          toggleOperatorStatus={toggleOperatorStatus}
          handleEditProfile={handleEditProfile}
          handleSaveAssignees={handleSaveAssignees}
        />


        {activeTab === 'analytics' && isAllowed('analytics') && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '800', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>{t('agencyOverview')}</h2>

            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <DollarSign size={20} color="var(--success-color)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('totalRevenue').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>£15,490</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+12.4% {t('vsLastWeek')}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={20} color="var(--accent-color)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('activeBookings').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>89</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+5 {t('thisWeek')}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <MessageSquare size={20} color="#a855f7" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('totalMessages').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>2,148</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('acrossAllProfiles')}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <TrendingUp size={20} color="#f59e0b" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('conversionRate').toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>11.5%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.5rem', fontWeight: '700' }}>+1.2% {t('trend')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexDirection: isMobile ? 'column' : 'row' }}>
              {/* Left Column: Profile Earnings */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--accent-color)" /> {t('perfByProfile')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {isMobile ? agencies.flatMap(a => a.profiles || []).slice(0, 10).map((p, i) => (
                    <div key={p.id || i} className="glass-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', background: 'var(--accent-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>{p.name[0]}</div>
                          <span style={{ fontWeight: '800', color: 'white' }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', borderRadius: '6px', fontWeight: '800' }}>#{i+1}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '800' }}>BOOKINGS</div>
                          <div style={{ fontWeight: '700', fontSize: '1rem' }}>{p.activeBookings || Math.floor(Math.random()*20)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '800' }}>EARNINGS</div>
                          <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--success-color)' }}>{p.earnings || '£' + (Math.floor(Math.random()*5000) + 1000)}</div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>PROFILE</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('rank').toUpperCase()}</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('activeBookings').toUpperCase()}</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>{t('earnings').toUpperCase()}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...allAgencyProfiles].sort((a,b) => parseInt((b.earnings || '£0').replace(/\D/g,'')) - parseInt((a.earnings || '£0').replace(/\D/g,''))).map((p, idx) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem', color: 'var(--accent-color)' }}>{p.name[0]}</div>
                                  <span style={{ fontWeight: '700' }}>{p.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <TrendingUp size={14} color="var(--success-color)" />
                                  <span style={{ fontWeight: '700' }}>#{idx + 1}</span>
                                </div>
                              </td>
                              <td style={{ padding: '1rem', fontWeight: '700' }}>{p.activeBookings || Math.floor(Math.random() * 15)}</td>
                              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '900', color: 'var(--success-color)' }}>{p.earnings}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Operator Activity */}
              <div style={{ width: isMobile ? '100%' : '450px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} color="var(--accent-color)" /> {t('perfByOperator')}
                </h3>
                <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OPERATOR</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>{t('totalMessages').toUpperCase()}</th>
                        <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>{t('callsHandled').toUpperCase()}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...availableOperators].sort((a,b) => (b.metrics?.messages || 0) - (a.metrics?.messages || 0)).map((op, i) => (
                        <tr key={op.id} style={{ borderBottom: i < availableOperators.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '900' }}>{op.avatar}</div>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{op.name}</div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>{op.metrics?.messages ?? 0}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{op.metrics?.calls ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* UNIT: AGENCY */}
        <AgencyUnit
          activeTab={activeTab}
          isMobile={isMobile}
          t={t}
          lang={lang}
          activeOperator={activeOperator}
          activeRole={activeRole}
          agencies={agencies}
          profiles={profiles}
          operators={operators}
          activityLogs={activityLogs}
          isAllowed={isAllowed}
          settings={settings}
          setSettings={setSettings}
          handleSaveSettings={handleSaveSettings}
          theme={theme}
          setTheme={setTheme}
        />

        {/* UNIT: INFRASTRUCTURE */}
        <InfrastructureUnit
          activeTab={activeTab}
          isMobile={isMobile}
          t={t}
          lang={lang}
          activeRole={activeRole}
          activeOperator={activeOperator}
          agencies={agencies}
          setAgencies={setAgencies}
          setIsAgencyDetailOpen={setIsAgencyDetailOpen}
          setSelectedAgency={setSelectedAgency}
          setIsAddAgencyOpen={setIsAddAgencyOpen}
          handleDeleteAgency={handleDeleteAgency}
          infraData={infraData}
          setInfraData={setInfraData}
          infraStats={infraStats}
          setInfraStats={setInfraStats}
          saveInfraConfig={saveInfraConfig}
          plans={subscriptionPlans}
          setPlans={setSubscriptionPlans}
          activeMarket={activeMarket}
          setActiveMarket={setActiveMarket}
          currentAgency={currentAgency}
          inventoryItems={inventoryItems}
          setInventoryItems={setInventoryItems}
          isAllowed={isAllowed}
          fetchUserPermissions={fetchUserPermissions}
        />
        {activeTab === 'relay' && (
          <RelayControlCenter t={t} isMobile={isMobile} />
        )}


        {/* Removed redundant QA Hub block */}
      </main>


      {/* Overlays */}
      {incomingCall && (
        <div className="incoming-call-popup fade-in">
          <div className="incoming-card">
            <div className="avatar-pulse"><Phone size={32} color="white" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-color)' }}>{t('incomingRelay')}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{incomingCall.caller}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('targetLabel')}: <strong>{incomingCall.profileName}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}><button onClick={() => setIncomingCall(null)} className="circle-btn decline"><X size={20} /></button><button onClick={acceptCall} className="circle-btn accept"><Check size={20} /></button></div>
          </div>
        </div>
      )}

      {activeCall && (
        <div className="call-overlay">
          <div className="call-card">
            <div className="call-avatar-container">
              <div className="call-avatar">
                <Users size={48} color="white" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{activeCall.caller}</h2>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>{formatTime(callTime)}</p>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`call-btn ${isMuted ? 'muted' : ''}`}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)', border: isMuted ? '1px solid var(--error-color)' : '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {isMuted ? <MicOff size={24} color="var(--error-color)" /> : <Mic size={24} color="white" />}
              </button>

              <button onClick={endCall} className="call-btn end">
                <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .unread-badge { margin-left: auto; background: var(--error-color); color: white; font-size: 0.7rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
        .avatar-circle { width: 48px; height: 48px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; alignItems: center; justifyContent: center; }
        .message-bubble-in { 
          align-self: flex-start; 
          max-width: 78%;
          background: rgba(255, 255, 255, 0.07); 
          padding: 0.65rem 0.95rem; 
          border-radius: 4px 18px 18px 18px; 
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          font-size: 0.93rem;
          line-height: 1.4;
          word-break: break-word;
        }
        .message-bubble-out { 
          align-self: flex-end; 
          max-width: 78%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          padding: 0.65rem 0.95rem; 
          border-radius: 18px 4px 18px 18px; 
          color: white;
          font-size: 0.93rem;
          line-height: 1.4;
          box-shadow: 0 2px 8px rgba(99,102,241,0.35);
          word-break: break-word;
        }
        @media (max-width: 768px) {
          .message-bubble-in, .message-bubble-out {
            max-width: 82%;
            padding: 0.55rem 0.8rem;
            font-size: 0.88rem;
          }
        }
        .suggestion-chip { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-secondary); padding: 0.6rem 1rem; borderRadius: 12px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .suggestion-chip:hover { background: rgba(59, 130, 246, 0.1); border-color: var(--accent-color); color: white; }
        .status-badge-small { font-size: 0.75rem; padding: 0.2rem 0.5rem; border: 1px solid var(--card-border); border-radius: 6px; display: inline-flex; }
        .hash-code { font-size: 0.8rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; }
        .dot { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 6px; height: 6px; background: var(--accent-color); borderRadius: 50%; }
        .truncate-text { font-size: 0.9rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; WebkitLineClamp: 1; WebkitBoxOrient: vertical; }
        .incoming-call-popup { position: fixed; bottom: 3rem; right: 3rem; z-index: 1000; width: 400px; }
        .incoming-card { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px); border: 1px solid var(--accent-color); padding: 1.5rem; border-radius: 24px; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 0 20px var(--accent-glow); }
        .avatar-pulse { width: 56px; height: 56px; background: var(--accent-color); border-radius: 16px; display: flex; align-items: center; justify-content: center; animation: ringPulse 2s infinite; }
        @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        .circle-btn { width: 44px; height: 44px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .circle-btn.decline { background: var(--error-color); color: white; }
        .circle-btn.accept { background: var(--success-color); color: white; }

        select::-ms-expand { display: none; }
        select { -webkit-appearance: none; appearance: none; }

        .action-btn.active { background: rgba(239, 68, 68, 0.1) !important; color: var(--error-color) !important; border-color: var(--error-color) !important; }

        .toggle-switch.active { box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
        .toggle-switch:hover { border-color: var(--accent-color) !important; }
      `}</style>

      {/* Client Departure Confirmation Overlay */}
      {departureCheckActive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: '#0f1117', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 40px rgba(16,185,129,0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚪</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.4rem' }}>Opustil klient bezpečně?</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', color: departureTimeLeft < 60 ? '#ef4444' : '#10b981' }}>
                {String(Math.floor(departureTimeLeft / 60)).padStart(2, '0')}:{String(departureTimeLeft % 60).padStart(2, '0')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button
                onClick={() => {
                  setDepartureCheckActive(false);
                  axios.post(`${API_BASE}/safety/sessions/${departureSessionId || activeSafetySession?.id}/departure-confirm`, {}, { headers: { Authorization: `Bearer ${token}` } });
                }}
                className="action-btn"
                style={{ flex: 1, background: 'var(--success-color)', color: 'white', fontWeight: '800' }}
              >
                Safe Departure
              </button>
              <button
                onClick={() => {
                  setDepartureCheckActive(false);
                  axios.post(`${API_BASE}/safety/sessions/${departureSessionId || activeSafetySession?.id}/panic`, {}, { headers: { Authorization: `Bearer ${token}` } });
                }}
                className="action-btn"
                style={{ flex: 1, background: 'var(--error-color)', color: 'white', fontWeight: '800' }}
              >
                PANIC ALERT
              </button>
            </div>
          </div>
        </div>
      )}

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        form={newBookingForm}
        onFormChange={setNewBookingForm}
        onSave={handleConfirmBooking}
        lang={lang}
      />

      <AddOperatorModal 
        isOpen={isAddOperatorModalOpen}
        onClose={() => setIsAddOperatorModalOpen(false)}
        data={newOperatorData}
        onDataChange={setNewOperatorData}
        onAdd={addOperator}
        t={t}
        lang={lang}
        activeRole={activeRole}
        activeOperator={activeOperator}
      />

      <EditProfileModal 
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        data={editingProfileData}
        onDataChange={setEditingProfileData}
        onSave={handleSaveProfile}
        t={t}
        lang={lang}
        isMobile={isMobile}
      />

      <AddAgencyModal 
        isOpen={isAddAgencyModalOpen}
        onClose={() => setIsAddAgencyModalOpen(false)}
        token={token}
        onAdd={(newAgency) => {
          setAgencies([...agencies, newAgency]);
          setIsAddAgencyModalOpen(false);
        }}
      />

      {renderNotifications()}
      {renderNotificationPanel()}
    </div>
    );
  };

  return (
    <NexusProvider>
      {renderContent()}
    </NexusProvider>
  );
}

export default App;

