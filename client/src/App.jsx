import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield, Laptop, Smartphone, Globe, Activity, Building2, MapPin,
  Search, Send, MessageCircle, Clock, Check, MoreVertical,
  AlertCircle, ChevronRight, User, Settings, LogOut, Layout,
  Calendar, Inbox, MessageSquare, Briefcase, Hash, DollarSign,
  TrendingUp, Users, UserPlus, UserCheck, ShieldCheck, CreditCard,
  Zap, Building, LayoutDashboard, Database,
    Phone, Server, Cpu, FileEdit, CheckCheck, FileSearch, Trash2,
    Eye, Save, X, RotateCcw, Lock, Share2, Filter, Menu, UserCircle, Plus, Info, ChevronDown, ChevronUp, ChevronLeft,
    BarChart2 as BarChart3, HardDrive, Gift, Trophy, RefreshCw, Bug, Copy, Signal, Mic, MicOff, Sparkles,
    StickyNote, AlertTriangle, Image, Link, Star, CheckCircle, Languages, Package, Bell,
    History, Terminal, Mail, ArrowUpRight, PlusCircle, BarChart, PieChart, Download, EyeOff, Radio
  } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Onboarding, { ONBOARDING_STORAGE_KEY } from './components/Onboarding';
import RelayMode from './components/RelayMode';
// Mock data imports removed for production hardening
import { TRANSLATIONS } from './translations';
import { useSocket } from './hooks/useSocket';
import QAView from './components/QAView';
import PermissionsDashboard from './components/PermissionsDashboard';
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
    qa_hub: true,
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
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [tempUser, setTempUser] = useState(null);
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
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('nexus_language') || 'en');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar');
  const [incomingCall, setIncomingCall] = useState(null);
  const [clientNotes, setClientNotes] = useState({});
  const [dbPermissions, setDbPermissions] = useState(null);

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
  const [subscriptionPlans] = useState([
    {
      id: 'basic',
      name: 'Basic Node',
      prices: { cz: '2,900 Kč', eu: '120 €', uk: '110 £' },
      description: 'Standard relay capabilities for small teams.',
      profilesLimit: 5,
      features: ['feat_sms', 'feat_calls', 'feat_analytics']
    },
    {
      id: 'pro',
      name: 'Professional',
      prices: { cz: '7,500 Kč', eu: '300 €', uk: '280 £' },
      description: 'Advanced features for growing agencies.',
      profilesLimit: 25,
      features: ['feat_sms', 'feat_calls', 'feat_smart_replies', 'feat_proxies', 'feat_priority', 'feat_audit']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      prices: { cz: '15,000 Kč', eu: '600 €', uk: '550 £' },
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
  const [activeMarket, setActiveMarket] = useState(lang === 'cz' ? 'cz' : 'eu');
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

  useEffect(() => {
    if (isLoggedIn && activeOperator) {
      fetchUserPermissions();
      fetchAgencies();
    }
  }, [isLoggedIn, activeOperator?.role, fetchUserPermissions, fetchAgencies]);

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
  const [bookingDetails, setBookingDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    duration: '60',
    type: 'work'
  });
  const [bookingSchedule, setBookingSchedule] = useState([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
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
      setBookingModalOpen(true); // Fallback to modal on error
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
      setBookingModalOpen(false);
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
    setBookingModalOpen(true);
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
        time: `${bookingDetails.time} ${parseInt(bookingDetails.time) >= 12 ? 'PM' : 'AM'}`,
        duration: `${parseInt(bookingDetails.duration) / 60}h`,
        title: `Private Booking - ${selectedChat?.from || 'Client'}`,
        status: 'busy',
        type: bookingDetails.type
    };
    setBookingSchedule(prev => [...prev, newEvent]);
    setIsBookingModalOpen(false);
  }, [bookingDetails, selectedChat, bookingSchedule]);

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
    setActiveTab(nextTab);
    if (isMobile && nextTab === 'inbox') {
      setSelectedChatId(null);
      setMobileView('list');
    }
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

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
    // Hide main header completely when in chat detail to avoid "two bars" and the black gap
    if (activeTab === 'inbox' && mobileView === 'chat') return null;

    return (
      <header className="mobile-app-header" style={{ 
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
        paddingBottom: '0.75rem',
        paddingLeft: '1.25rem',
        paddingRight: '1.25rem',
        display: 'flex',
        alignItems: 'center', 
        background: 'rgba(7, 10, 15, 0.95)',
        backdropFilter: 'blur(25px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: 'auto',
        minHeight: '60px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
          <img src="/nexus_icon.png" alt="Nexus Hub" style={{ width: '30px', height: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'white' }}>Nexus Hub</div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', fontWeight: '800' }}>{activeRole?.toUpperCase() || 'SYSTEM'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Universal SOS Button in Top Bar */}
          {(activeOperator?.isModel || (isMobile && activeOperator && !activeOperator?.isAppOwner && !activeOperator?.isAdmin && !activeOperator?.isManager)) && (
            <button 
              onClick={() => setShowPanicConfirm(true)}
              style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Shield size={20} />
            </button>
          )}

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setLang('cz')} style={{ padding: '4px 6px', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.55rem', fontWeight: '900', cursor: 'pointer' }}>CZ</button>
            <button onClick={() => setLang('en')} style={{ padding: '4px 6px', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '6px', fontSize: '0.55rem', fontWeight: '900', cursor: 'pointer' }}>EN</button>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Menu size={20} />
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
    
    // Authenticated UI
    return (
      <div className="mobile-container" style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        minHeight: '100dvh', 
        height: '100vh', 
        width: '100%', 
        maxWidth: '100%', 
        overflowX: 'hidden', 
        overflowY: 'hidden', 
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
            padding-bottom: calc(3.5rem + max(env(safe-area-inset-bottom), 0px)) !important;
            flex: 1 !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .mobile-app-header {
            flex-shrink: 0 !important;
          }
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
      {(!isMobile || isMobileMenuOpen) && (
        <nav className={`desktop-sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
          width: isMobile ? '100vw' : (isSidebarCollapsed ? '80px' : '280px'),
          flexShrink: 0,
          borderRight: isMobile ? 'none' : '1px solid var(--card-border)',
          padding: isMobile ? '0' : (isSidebarCollapsed ? '1.5rem 0.75rem' : '2.5rem 1.25rem'),
          background: isMobile ? 'rgba(7, 10, 15, 0.98)' : 'rgba(7, 10, 15, 0.7)',
          backdropFilter: isMobile ? 'blur(20px)' : 'blur(40px)',
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          height: '100dvh',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 10000,
          overflow: 'hidden'
        }}>
        {isMobile ? (
          /* Full Screen Mobile Menu Content */
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            width: '100%',
            padding: 'max(env(safe-area-inset-top), 2rem) 1.5rem calc(max(env(safe-area-inset-bottom), 0px) + 3.25rem)'
          }}>
            {/* Mobile Menu Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}>{activeOperator?.avatar}</div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white' }}>{activeOperator?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.05em' }}>{activeRole?.toUpperCase() || ''}</div>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
              </button>
            </div>

            {/* Mobile Menu Grid */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              paddingBottom: '2rem'
            }} className="custom-scrollbar">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '1rem'
              }}>
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
                  { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: totalUnread },
                  { id: 'calendar', icon: Calendar, label: t('schedule') },
                  { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                  { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                  { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
                  { id: 'infra', icon: HardDrive, label: t('infra'), perm: 'infrastructure' },
                  { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
                ].filter(item => !item.perm || (rolePermissions[activeRole] || {})[item.perm]).map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      padding: '1.25rem 1rem', background: activeTab === item.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: activeTab === item.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                    }}
                  >
                    <item.icon size={26} color={activeTab === item.id ? 'var(--accent-color)' : 'rgba(255,255,255,0.6)'} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{item.label}</span>
                    {item.badge > 0 && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--error-color)', color: 'white', fontSize: '0.6rem', minWidth: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' }}>{item.badge}</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Assigned Profiles in Mobile Menu */}
              {activeRole !== 'Model' && activeRole !== 'App Owner' && !activeOperator?.isAdmin && myProfiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{t('myAssignedGirls').toUpperCase()}</div>
                    <div onClick={() => setShowOnlyOnline(!showOnlyOnline)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}></div>
                      <span style={{ fontSize: '0.62rem', fontWeight: '900', color: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.3)' }}>ONLINE</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {myProfiles.filter(p => !showOnlyOnline || p.status === 'online').slice(0, 10).map(p => {
                      const unread = getUnreadForProfile(p.id);
                      return (
                        <button key={p.id} onClick={() => { 
                          setActiveProfileId(p.id); 
                          setActiveTab('inbox'); 
                          const firstUnread = messages.find(m => m.profileId === p.id && m.status === 'unread');
                          if (firstUnread) {
                            setSelectedChatId(firstUnread.id);
                            setMobileView('chat');
                          }
                          setIsMobileMenuOpen(false); 
                        }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '15px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', width: '100%', textAlign: 'left'
                          }}
                        >
                          <div style={{ width: '8px', height: '8px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>{p.name}</span>
                          {unread > 0 && <div style={{ background: 'var(--error-color)', color: 'white', fontSize: '0.6rem', minWidth: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' }}>{unread}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Relay Mode Button */}
              <button
                onClick={() => {
                  localStorage.setItem('nexus_relay_mode', 'true');
                  setIsRelayMode(true);
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '18px', cursor: 'pointer', width: '100%', color: 'var(--accent-color)', fontWeight: '950'
                }}
              >
                <Radio size={22} />
                <span>RELAY MODE</span>
              </button>
            </div>

            {/* Mobile Menu Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => { setNotificationPanelOpen(true); setIsMobileMenuOpen(false); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', color: 'white', fontWeight: '800', fontSize: '0.9rem' }}
              >
                <Bell size={18} /> {t('notifications') || 'Alerts'}
              </button>
              <button 
                onClick={handleLogout}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '15px', color: 'var(--error-color)', fontWeight: '800', fontSize: '0.9rem' }}
              >
                <LogOut size={18} /> {t('logout') || 'Exit'}
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Sidebar Content */
          <>
            <div style={{ 
              marginTop: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 1rem)' : 0,
              marginBottom: '2rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem', 
              alignItems: isSidebarCollapsed ? 'center' : 'stretch' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', width: '100%', marginBottom: isSidebarCollapsed ? '1.5rem' : '0.5rem' }}>
                <div 
                  onClick={() => setActiveTab('dashboard')}
                  style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}
                >
                  <div style={{ 
                    width: isSidebarCollapsed ? '42px' : '48px', 
                    height: isSidebarCollapsed ? '42px' : '48px', 
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}>
                    <img src="/nexus_icon.png" alt="Nexus Hub" style={{ width: '100%', height: '100%', borderRadius: '12px', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }} />
                  </div>
                  {!isSidebarCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Nexus Hub</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: '800', letterSpacing: '0.15em', marginTop: '0.15rem' }}>PREMIUM SYNC</span>
                    </div>
                  )}
                </div>
              </div>
              
              {!isSidebarCollapsed && (
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '3px', borderRadius: '12px', border: '1px solid var(--card-border)', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '9px', flex: 1 }}>
                    <button onClick={() => setLang('cz')} style={{ flex: 1, padding: '5px 0', border: 'none', background: lang === 'cz' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '7px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>CZ</button>
                    <button onClick={() => setLang('en')} style={{ flex: 1, padding: '5px 0', border: 'none', background: lang === 'en' ? 'var(--accent-color)' : 'transparent', color: 'white', borderRadius: '7px', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
                  </div>
                  <button 
                    onClick={() => setNotificationPanelOpen(true)} 
                    style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Bell size={16} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', marginRight: '-0.75rem', paddingRight: '0.75rem' }} className="custom-scrollbar">
              {/* Main Navigation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
                  { id: 'inbox', icon: MessageSquare, label: t('messages'), badge: activeOperator?.isModel ? 0 : totalUnread, perm: 'messaging' },
                  { id: 'calendar', icon: Calendar, label: t('schedule'), perm: 'calendar' },
                  { id: 'analytics', icon: BarChart3, label: t('analytics'), perm: 'analytics' },
                  { id: 'profiles', icon: Users, label: t('profiles'), perm: 'profiles' },
                ].filter(item => !item.perm || (rolePermissions[activeRole] || {})[item.perm]).map(item => (
                  <button key={item.id} 
                    onClick={() => {
                      setActiveTab(item.id);
                      if (isMobile) setIsMobileMenuOpen(false);
                    }}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '1.15rem', padding: '0.85rem 1.15rem', borderRadius: '14px',
                      background: activeTab === item.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s',
                      justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                      border: activeTab === item.id ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid transparent'
                    }}
                  >
                    <item.icon size={20} color={activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                    {!isSidebarCollapsed && (
                      <span style={{ color: activeTab === item.id ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === item.id ? '900' : '500', fontSize: '0.95rem' }}>
                        {item.label}
                      </span>
                    )}
                    {item.badge > 0 && !isSidebarCollapsed && (
                      <div style={{ marginLeft: 'auto', background: 'var(--accent-color)', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', fontWeight: '950' }}>{item.badge}</div>
                    )}
                  </button>
                ))}

                {/* Collapsible System Tools */}
                <div style={{ marginTop: '0.75rem' }}>
                  {!isSidebarCollapsed && (
                    <button 
                      onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1.15rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.12em' }}
                    >
                      {t('global_features').toUpperCase() || 'SYSTEM TOOLS'}
                      {isToolsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                  
                  {(isToolsExpanded || isSidebarCollapsed) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem', paddingLeft: isSidebarCollapsed ? '0' : '0.5rem' }}>
                      {[
                        { id: 'infra', icon: HardDrive, label: t('infra'), perm: 'infrastructure' },
                        { id: 'agencies', icon: Building2, label: t('agencies'), perm: 'agencies' },
                        { id: 'permissions', icon: Shield, label: t('permissions'), perm: 'permissions' },
                        { id: 'plans', icon: CreditCard, label: t('plans'), perm: 'plans' },
                        { id: 'features', icon: Zap, label: t('features'), perm: 'global_features' },
                        { id: 'inventory', icon: Package, label: t('stockCard') || 'Sklad', perm: 'inventory' },
                        { id: 'web-profiles', icon: Globe, label: t('webProfiles'), perm: 'web_profiles' },
                        { id: 'device-setup', icon: Smartphone, label: t('deviceSetup'), perm: 'device_setup' },
                        { id: 'activity', icon: Activity, label: t('auditLog'), perm: 'audit_logs' },
                        { id: 'qa', icon: FileSearch, label: t('qa'), perm: 'qa_hub' },
                        { id: 'settings', icon: Settings, label: t('settings'), perm: 'settings' },
                      ].filter(item => isAllowed(item.perm)).map(item => (
                        <button key={item.id} 
                          onClick={() => {
                            setActiveTab(item.id);
                            if (isMobile) setIsMobileMenuOpen(false);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.95rem', padding: '0.7rem 1.15rem', border: 'none', borderRadius: '12px',
                            background: activeTab === item.id ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                            cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s',
                            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
                          }}
                          title={isSidebarCollapsed ? item.label : ''}
                        >
                          <item.icon size={19} color={activeTab === item.id ? 'var(--accent-color)' : 'rgba(255,255,255,0.45)'} />
                          {!isSidebarCollapsed && (
                            <span style={{ color: activeTab === item.id ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: activeTab === item.id ? '700' : '500', fontSize: '0.88rem' }}>
                              {item.label}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Girls Section */}
              {!activeOperator?.isModel && activeRole !== 'App Owner' && !activeOperator?.isAdmin && !isSidebarCollapsed && (
                <div style={{ marginTop: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '950', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{t('myAssignedGirls').toUpperCase()}</div>
                    <div onClick={() => setShowOnlyOnline(!showOnlyOnline)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.2)' }}></div>
                      <span style={{ fontSize: '0.6rem', fontWeight: '900', color: showOnlyOnline ? 'var(--success-color)' : 'rgba(255,255,255,0.3)' }}>ONLINE</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '35vh', overflowY: 'auto' }} className="custom-scrollbar">
                    {myProfiles.filter(p => !showOnlyOnline || p.status === 'online').map(p => {
                      const unread = getUnreadForProfile(p.id);
                      const isActive = activeProfile?.id === p.id;
                      return (
                        <button key={p.id} onClick={() => {
                          setActiveProfileId(p.id);
                          setActiveTab('inbox');
                          const firstUnread = messages.find(m => m.profileId === p.id && m.status === 'unread');
                          if (firstUnread) {
                            setSelectedChatId(firstUnread.id);
                            if (isMobile) setMobileView('chat');
                          } else {
                            setSelectedChatId(null);
                          }
                          if (isMobile) setIsMobileMenuOpen(false);
                        }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.7rem 0.85rem', border: '1px solid',
                            borderRadius: '14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                            borderColor: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                          }}
                        >
                          <div style={{ width: '8px', height: '8px', background: p.status === 'online' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', borderRadius: '50%', flexShrink: 0 }}></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: isActive ? '800' : '600', color: isActive ? 'white' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          </div>
                          {unread > 0 && <div style={{ background: 'var(--error-color)', color: 'white', fontSize: '0.62rem', minWidth: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '950' }}>{unread}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: isSidebarCollapsed ? '0' : '0 0.5rem', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1d4ed8 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white', fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 6px 15px rgba(0,0,0,0.4)' }}>{activeOperator?.avatar}</div>
                {!isSidebarCollapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{activeOperator?.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.05em' }}>{activeRole?.toUpperCase() || ''}</div>
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <button 
                    onClick={handleLogout}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error-color)', width: '30px', height: '30px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </nav>
      )}

      {/* Main Area */}
      <main className="main-content custom-scrollbar" style={{
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        height: isMobile ? 'calc(100dvh - 70px - max(env(safe-area-inset-top), 0px))' : '100vh',
        minWidth: 0,
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
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
            t={t} 
            lang={lang}
            agencies={agencies} 
            profiles={profiles}
            calendar={bookingSchedule}
            isShiftActive={isShiftActive}
            setIsShiftActive={setIsShiftActive}
            isMobile={isMobile}
            stats={stats}
            activeSubscription={activeSubscription}
          />
        )}

        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }} className="fade-in inbox-grid">
            {/* Column 1: Inbox List */}
            {(!isMobile || mobileView === 'list') && (
              <div className={`inbox-panel ${!selectedChatId ? 'active' : ''}`} style={{ width: isMobile ? '100%' : '380px', flexShrink: 0, borderRight: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', whiteSpace: 'nowrap' }}>{t('inbox')}</h2>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                      <select 
                        value={activeProfileId} 
                        onChange={(e) => {
                          setActiveProfileId(e.target.value);
                          setSelectedChatId(null); // Reset selection when switching model
                        }}
                        style={{ 
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid var(--card-border)', 
                          padding: '0.4rem 2rem 0.4rem 0.85rem', 
                          borderRadius: '10px', 
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          appearance: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {assignedProfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder={t('searchPlaceholder')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '12px', color: 'white' }} />
                  </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filteredMessages.length > 0 ? filteredMessages.map(msg => (
                    <div key={msg.id} onClick={() => { 
                      setSelectedChatId(msg.id); 
                      if (isMobile) setMobileView('chat');
                      if (!isTranslating) {
                        setSourceText("");
                        setTranslatedText("");
                      }
                      setInternalNote("");
                      if (msg.from && !clientNotes[msg.from]) {
                        setClientNotes(prev => ({ ...prev, [msg.from]: [] }));
                      }
                    }}
                      style={{ 
                        padding: '1.5rem', 
                        borderBottom: '1px solid var(--card-border)', 
                        background: selectedChat?.id === msg.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', 
                        cursor: 'pointer', 
                        position: 'relative',
                        borderLeft: selectedChat?.id === msg.id ? '6px solid var(--accent-color)' : '6px solid transparent',
                        boxShadow: selectedChat?.id === msg.id ? 'inset 0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
                        transition: 'all 0.2s ease'
                      }}>
                      {msg.status === 'unread' && <div className="dot"></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: selectedChat?.id === msg.id ? '800' : '700', fontSize: '1.1rem', color: selectedChat?.id === msg.id ? 'white' : 'inherit' }}>
                          {clientNames[msg.from] || msg.from}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.time}</span>
                      </div>
                      <div className="truncate-text" style={{ opacity: selectedChat?.id === msg.id ? 1 : 0.7 }}>{msg.text}</div>
                    </div>
                  )) : <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noMessages')}</div>}
                  <div style={{ height: isMobile ? '80px' : '0' }}></div>
                </div>
              </div>
            )}

            {/* Column 2 & 3 Container */}
            {(!isMobile || mobileView !== 'list') && (
              <div className={`inbox-panel ${selectedChatId ? 'active' : ''} ${isMobile && !selectedChatId ? 'hidden-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', minWidth: 0, overflow: 'hidden', minHeight: 0 }}>
                  {/* Stable Debug Chat Detail */}
                  {selectedChat ? (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                      <div style={{ paddingTop: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' : '1.5rem', paddingBottom: isMobile ? '0.75rem' : '1.5rem', paddingLeft: isMobile ? '1rem' : '2rem', paddingRight: isMobile ? '1rem' : '2rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {isMobile && <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', color: 'white' }}><ChevronLeft size={24} /></button>}
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem' }}>
                            {(clientNames[selectedChat.from] || selectedChat.from).slice(-2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>{clientNames[selectedChat.from] || selectedChat.from}</div>
                            {clientNames[selectedChat.from] && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedChat.from}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
                          <button onClick={startCall} className="status-badge" style={{ color: 'var(--accent-color)', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.1)', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '800' }}>
                            <Signal size={14} /> CALL
                          </button>
                          
                          {/* Universal SOS Button also in Chat Header for redundancy */}
                          {(activeOperator?.isModel || (isMobile && activeOperator && !activeOperator?.isAppOwner && !activeOperator?.isAdmin && !activeOperator?.isManager)) && (
                            <button 
                              onClick={() => setShowPanicConfirm(true)}
                              style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Shield size={20} />
                            </button>
                          )}

                          <button 
                            onClick={() => alert('Options: Block Client, Delete Chat, Mark as Spam (Coming soon)')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <MoreVertical size={22} />
                          </button>
                        </div>
                      </div>
                      <div
                        ref={chatScrollRef}
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                          isUserScrolled.current = distFromBottom > 100;
                        }}
                        style={{ flex: 1, padding: isMobile ? '0.5rem 0.75rem' : '2rem', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: isMobile ? '0' : '0.25rem', minHeight: 0, justifyContent: 'flex-end' }}>
                         {isHistoryLoading && chatMessages.length === 0 ? (
                           <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading history...</div>
                         ) : chatMessages.length > 0 ? (
                           chatMessages.map((msg, i) => (
                             <div key={msg.id || i} className={msg.direction === 'OUTBOUND' ? 'message-bubble-out' : 'message-bubble-in'} style={{ alignSelf: msg.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start', marginBottom: isMobile ? '0.35rem' : '0.6rem' }}>
                               <div style={{ fontSize: isMobile ? '0.88rem' : '0.95rem' }}>{msg.text}</div>
                               <div style={{ fontSize: '0.62rem', opacity: 0.5, marginTop: '2px', textAlign: 'right' }}>
                                 {new Date(msg.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })}
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="message-bubble-in" style={{ marginBottom: '1rem' }}>{selectedChat.text}</div>
                         )}

                         {typingProfiles[activeProfileId] === selectedChat.from && (
                           <div className="message-bubble-in fade-in" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                             <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate' }}></div>
                             <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.2s' }}></div>
                             <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--accent-color)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.4s' }}></div>
                           </div>
                         )}
                      </div>
                      <div style={{ borderTop: '1px solid var(--card-border)' }}>
                        {isMobile && (
                          <>
                            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                              {[{id:'note',icon:StickyNote,label:lang==='cz'?'Poznámky':'Notes',color:'#f59e0b'},{id:'translator',icon:Languages,label:lang==='cz'?'Překladač':'Translator',color:'#3b82f6'},{id:'quickReplies',icon:Zap,label:lang==='cz'?'Odpovědi':'Replies',color:'#10b981'}].map(({id,icon:Icon,label,color})=>(<button key={id} onClick={()=>setInlinePanelTab(prev=>prev===id?null:id)} style={{display:'flex',alignItems:'center',gap:'0.3rem',padding:'0.25rem 0.6rem',borderRadius:'8px',cursor:'pointer',fontSize:'0.67rem',fontWeight:'700',background:inlinePanelTab===id?`rgba(${id==='note'?'245,158,11':id==='translator'?'59,130,246':'16,185,129'},0.15)`:'rgba(255,255,255,0.04)',border:`1px solid ${inlinePanelTab===id?color:'rgba(255,255,255,0.07)'}`,color:inlinePanelTab===id?color:'var(--text-secondary)',transition:'all 0.18s'}}><Icon size={11}/> {label}</button>))}
                            </div>
                            {inlinePanelTab && (
                              <div className="fade-in custom-scrollbar" style={{borderBottom:'1px solid var(--card-border)',padding:'0.75rem 1.25rem',maxHeight:'175px',overflowY:'auto',background:'rgba(255,255,255,0.01)'}}>
                                {inlinePanelTab==='note' && (<div style={{display:'flex',flexDirection:'column',gap:'0.45rem'}}><textarea value={internalNote} onChange={e=>setInternalNote(e.target.value)} placeholder={lang==='cz'?'Přidat poznámku...':'Add internal note...'} style={{width:'100%',minHeight:'62px',background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'0.55rem 0.7rem',color:'#f59e0b',resize:'none',fontSize:'0.81rem'}}/><button onClick={handleSaveNote} disabled={!internalNote.trim()} style={{alignSelf:'flex-end',background:'rgba(245,158,11,0.2)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.4)',padding:'0.25rem 0.8rem',borderRadius:'8px',fontWeight:'700',fontSize:'0.69rem',opacity:internalNote.trim()?1:0.4}}>{lang==='cz'?'Uložit':'Save'}</button></div>)}
                                {inlinePanelTab==='translator' && (<div style={{display:'flex',flexDirection:'column',gap:'0.45rem'}}><textarea value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder={lang==='cz'?'Text k překladu...':'Text to translate...'} style={{width:'100%',minHeight:'52px',background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.55rem 0.7rem',color:'white',resize:'none',fontSize:'0.81rem'}}/>{translatedText&&<div style={{fontSize:'0.78rem',color:'#93c5fd',padding:'0.38rem 0.62rem',background:'rgba(59,130,246,0.08)',borderRadius:'8px',lineHeight:1.5}}>{translatedText}</div>}<div style={{display:'flex',gap:'0.5rem'}}><button onClick={handleTranslate} disabled={isTranslating||!sourceText.trim()} style={{flex:1,background:'var(--accent-color)',color:'white',border:'none',padding:'0.3rem',borderRadius:'8px',fontWeight:'800',fontSize:'0.67rem',opacity:(!sourceText.trim()||isTranslating)?0.4:1}}>{isTranslating?'…':(lang==='cz'?'PŘELOŽIT':'TRANSLATE')}</button>{translatedText&&<button onClick={()=>{setMessageValue(translatedText);setInlinePanelTab(null);}} style={{flex:1,background:'rgba(59,130,246,0.15)',color:'#93c5fd',border:'1px solid rgba(59,130,246,0.3)',padding:'0.3rem',borderRadius:'8px',fontWeight:'800',fontSize:'0.67rem',cursor:'pointer'}}>{lang==='cz'?'POUŽÍT':'USE'}</button>}</div></div>)}
                                {inlinePanelTab==='quickReplies' && (<div style={{display:'flex',flexDirection:'column',gap:'0.32rem'}}>{!(activeProfile?.quickReplies?.length)?(<div style={{textAlign:'center',padding:'0.75rem',color:'var(--text-secondary)',fontSize:'0.76rem'}}>{lang==='cz'?'Žádné rychlé odpovědi.':'No quick replies yet.'}</div>):activeProfile.quickReplies.map(reply=>(<button key={reply.id} onClick={()=>{setMessageValue(reply.text);setInlinePanelTab(null);}} style={{textAlign:'left',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.18)',borderRadius:'8px',padding:'0.4rem 0.68rem',cursor:'pointer'}}><div style={{fontSize:'0.65rem',fontWeight:'800',color:'#10b981',marginBottom:'0.06rem'}}>{reply.label}</div><div style={{fontSize:'0.74rem',color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{reply.text}</div></button>))}</div>)}
                              </div>
                            )}
                          </>
                        )}
                         <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
                         {/* Meeting detection banner */}

                         {detectedMeeting && (
                           <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px' }}>
                             <Calendar size={14} color="var(--success-color)" />
                             <span style={{ flex: 1, fontSize: '0.72rem', color: 'var(--success-color)', fontWeight: '700' }}>Detekován čas: <strong>{detectedMeeting.time}</strong> — Uložit schůzku?</span>
                             <button
                               onClick={handleQuickSaveMeeting}
                               style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--success-color)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
                             >Uložit</button>
                             <button onClick={() => setDetectedMeeting(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>×</button>
                           </div>
                         )}
                         {selectedChat && activeProfile?.quickReplies?.length > 0 && (
                           <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }} className="custom-scrollbar">
                             {activeProfile.quickReplies.map((reply) => (
                               <button
                                 key={reply.id}
                                 onClick={() => setMessageValue(reply.text)}
                                 style={{ 
                                   whiteSpace: 'nowrap',
                                   background: 'rgba(59, 130, 246, 0.1)',
                                   border: '1px solid rgba(59, 130, 246, 0.3)',
                                   color: 'var(--accent-color)',
                                   padding: '0.4rem 0.8rem',
                                   borderRadius: '8px',
                                   fontSize: '0.75rem',
                                   fontWeight: '700',
                                   cursor: 'pointer'
                                 }}
                               >
                                 {reply.label}
                               </button>
                             ))}
                           </div>
                         )}
                         <div style={{ display: 'flex', gap: '1rem' }}>
                            <input 
                              type="text" 
                              value={messageValue}
                              onChange={(e) => setMessageValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && messageValue.trim()) {
                                  handleSendMessage(messageValue);
                                }
                              }}
                              placeholder="Type a message..." 
                              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '1rem', borderRadius: '12px', color: 'white' }} 
                            />
                            <button 
                              onClick={() => {
                                if (messageValue.trim()) {
                                  handleSendMessage(messageValue);
                                }
                              }}
                              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                            >
                              SEND
                            </button>
                         </div>
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                      <div>
                        <MessageSquare size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>Select a conversation</h3>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Notes / Details */}
                {(!isMobile || mobileView === 'details') && (
                  <div className="notes-panel-container" style={{ 
                    width: isMobile ? '100%' : '400px', 
                    flexShrink: 0, 
                    borderLeft: isMobile ? 'none' : '1px solid var(--card-border)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    background: 'var(--bg-color)', 
                    overflow: 'hidden',
                    position: isMobile ? 'absolute' : 'static',
                    top: 0, right: 0, bottom: 0, zIndex: 1100
                  }}>
                    {isMobile && (
                      <div style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)' }}>
                        <button onClick={() => setMobileView('chat')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChevronLeft size={20} /> {t('backToChat')}
                        </button>
                      </div>
                    )}
                    {selectedChat ? (
                      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                         {/* Tab bar */}
                         <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                           <button onClick={() => setActiveContextTab('translator')} style={{ flex: 1, padding: '0.6rem 0.25rem', border: 'none', background: 'transparent', color: activeContextTab === 'translator' ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                             <Languages size={13} /> {lang === 'cz' ? 'Překladač' : 'Translator'}
                           </button>
                           <button onClick={() => setActiveContextTab('note')} style={{ flex: 1, padding: '0.6rem 0.25rem', border: 'none', background: 'transparent', color: activeContextTab === 'note' ? '#f59e0b' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                             <StickyNote size={13} /> {lang === 'cz' ? 'Poznámky' : 'Notes'}
                           </button>
                           <button onClick={() => setActiveContextTab('quickReplies')} style={{ flex: 1, padding: '0.6rem 0.25rem', border: 'none', background: 'transparent', color: activeContextTab === 'quickReplies' ? '#10b981' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                             <Zap size={13} /> {lang === 'cz' ? 'Odpovědi' : 'Replies'}
                           </button>
                         </div>
                        {/* Tab content */}
                        <div style={{ padding: '1.25rem', flex: '1 1 0', minHeight: 0, maxHeight: '45%', overflowY: 'auto' }}>
                          {activeContextTab === 'translator' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={t('typeResponse')} style={{ width: '100%', height: '100px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem', color: 'white', resize: 'none' }} />
                              <button onClick={handleTranslate} disabled={isTranslating} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                {isTranslating ? (<><div className="loader-dots" style={{ display: 'flex', gap: '4px' }}><span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span><span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span><span style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%' }}></span></div>{t('translating')}</>) : (<><Sparkles size={16} /> {lang === 'cz' ? 'PŘELOŽIT PŘES AI' : 'TRANSLATE VIA AI'}</>)}
                              </button>
                              {translatedText && (
                                <div className="fade-in" style={{ padding: '1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', position: 'relative' }}>
                                  <div style={{ position: 'absolute', top: '-8px', right: '12px', background: 'var(--accent-color)', color: 'white', fontSize: '0.6rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>{t('poweredByAi')}</div>
                                  <div style={{ fontSize: '0.9rem', color: 'white', lineHeight: '1.5' }}>{translatedText}</div>
                                  <button onClick={() => { setMessageValue(translatedText); setActiveContextTab('note'); }} style={{ marginTop: '0.75rem', width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>
                                    {lang === 'cz' ? 'POUŽÍT PŘEKLAD' : 'USE TRANSLATION'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : activeContextTab === 'note' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Add internal note..." style={{ width: '100%', minHeight: '100px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem', color: '#f59e0b' }} />
                              <button onClick={handleSaveNote} disabled={!internalNote.trim()} style={{ alignSelf: 'flex-end', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700' }}>Save Note</button>
                              {(clientNotes[selectedChat?.from] || []).length > 0 && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>SAVED NOTES</div>
                                  {(clientNotes[selectedChat.from] || []).slice().reverse().map(note => (
                                    <div key={note.id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', padding: '0.75rem', position: 'relative' }}>
                                      <button onClick={() => handleDeleteNote(selectedChat.from, note.id)} style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', color: 'rgba(245,158,11,0.5)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 4px' }}>×</button>
                                      <div style={{ fontSize: '0.85rem', color: '#f59e0b', lineHeight: '1.5', paddingRight: '1.5rem' }}>{note.text}</div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{note.author} · {note.timestamp}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Quick Replies tab */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {(activeProfile?.quickReplies || []).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                  <Zap size={32} style={{ opacity: 0.2, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                                  {lang === 'cz' ? 'Žádné rychlé odpovědi. Přidej je v nastavení profilu.' : 'No quick replies yet. Add them in Profile Settings.'}
                                </div>
                              ) : (
                                (activeProfile.quickReplies || []).map(reply => (
                                  <button key={reply.id} onClick={() => setMessageValue(reply.text)} style={{ textAlign: 'left', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', marginBottom: '0.2rem' }}>{reply.label}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reply.text}</div>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      {/* Calendar mini-panel below tabs */}
                      {(() => {
                        const calDateStr = calViewDate.toISOString().split('T')[0];
                        const bookingsForDate = bookingSchedule.filter(b => b.startTime?.startsWith(calDateStr));
                        const isToday = calDateStr === new Date().toISOString().split('T')[0];
                        const dayName = calViewDate.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { weekday: 'long' });
                        const dayDate = calViewDate.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'long' });
                        return (
                          <div style={{ borderTop: '1px solid var(--card-border)', flex: '0 0 auto', display: 'flex', flexDirection: 'column', height: '340px' }}>
                            {/* day nav header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid var(--card-border)', flexShrink: 0 }}>
                              <button onClick={() => { const d = new Date(calViewDate); d.setDate(d.getDate()-1); setCalViewDate(d); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}><ChevronLeft size={13} /></button>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isToday ? (lang === 'cz' ? 'DNES' : 'TODAY') : dayName}</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', color: isToday ? 'var(--accent-color)' : 'white', lineHeight: 1.2 }}>{dayDate}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                {!isToday && <button onClick={() => setCalViewDate(new Date())} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '5px', color: '#a5b4fc', fontSize: '0.58rem', fontWeight: '800', cursor: 'pointer', padding: '0.2rem 0.45rem' }}>Dnes</button>}
                                <button onClick={() => { const d = new Date(calViewDate); d.setDate(d.getDate()+1); setCalViewDate(d); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}><ChevronRight size={13} /></button>
                              </div>
                            </div>
                            {/* bookings list */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {bookingsForDate.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                  <Calendar size={24} style={{ opacity: 0.25 }} />
                                  <span style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>{lang === 'cz' ? 'Žádné schůzky' : 'No bookings'}</span>
                                </div>
                              ) : bookingsForDate.map(b => {
                                const timeStr = b.startTime ? new Date(b.startTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }) : (b.time || '');
                                const endStr = b.endTime ? new Date(b.endTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }) : '';
                                return (
                                  <div key={b.id} style={{ display: 'flex', gap: '0.6rem', padding: '0.5rem 0.65rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)', alignItems: 'flex-start' }}>
                                    <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '42px' }}>
                                      <div style={{ fontSize: '0.67rem', fontWeight: '900', color: 'var(--accent-color)', lineHeight: 1.3 }}>{timeStr}</div>
                                      {endStr && <div style={{ fontSize: '0.57rem', color: 'var(--text-secondary)', lineHeight: 1 }}>{endStr}</div>}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                                      {b.profileName && <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{b.profileName}</div>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Přidat schůzku — pinned at bottom of right panel */}
                      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--card-border)', background: 'var(--bg-secondary, #0f1117)', flexShrink: 0 }}>
                        <button
                          onClick={() => { const d = calViewDate.toISOString().split('T')[0]; setNewBookingForm(f => ({ ...f, date: d })); setBookingModalOpen(true); }}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--accent-color)', border: 'none', color: 'white', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <PlusCircle size={16} /> {lang === 'cz' ? 'Přidat schůzku' : 'Add booking'}
                        </button>
                      </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('selectConversationDesc')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
   
        {activeTab === 'calendar' && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '3rem', paddingBottom: '8rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2.5rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800' }}>{t('bookingSchedule')}</h2>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>•</span>
                    <select 
                      value={activeProfileId} 
                      onChange={(e) => setActiveProfileId(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--card-border)', 
                        color: 'var(--accent-color)', 
                        padding: '0.4rem 1rem', 
                        borderRadius: '8px', 
                        fontSize: '0.9rem', 
                        fontWeight: '700',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {(activeRole === 'App Owner' || activeRole === 'Agency Admin' || activeRole === 'Manager' ? allAgencyProfiles : myProfiles).map(p => (
                        <option key={p.id} value={p.id} style={{ background: '#0a0c10', color: 'white' }}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('bookingScheduleDesc')}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                 <button onClick={() => setBookingModalOpen(true)} style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: 'white', border: 'none', background: 'var(--accent-color)', borderRadius: '15px', fontWeight: '800', fontSize: '0.85rem' }}>
                   <Plus size={16} /> {lang === 'cz' ? 'Přidat akci' : 'Add Booking'}
                 </button>
                 <button 
                   onClick={handleExportICS}
                   className="glass-card" 
                   style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '0.75rem', cursor: 'pointer', color: 'white', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', flex: isMobile ? 1 : 'none' }}
                 >
                   <Share2 size={18} /> <span>{t('exportCalendar')}</span>
                 </button>
                 <button 
                   onClick={() => setIsCalendarSyncOpen(!isCalendarSyncOpen)}
                   className="glass-card" 
                   style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '0.75rem', cursor: 'pointer', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', background: 'rgba(59,130,246,0.1)', borderRadius: '15px', flex: isMobile ? 1 : 'none' }}
                 >
                   <Link size={18} /> <span>{t('syncCalendar')}</span>
                 </button>
              </div>
            </div>

            {isCalendarSyncOpen && (
              <div className="glass-card fade-in" style={{ position: 'relative', padding: '1.5rem 1.5rem 2rem', marginBottom: '2rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <button onClick={() => setIsCalendarSyncOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={18} /> {t('syncCalendar')}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '480px' }}>{t('syncDesc')}</p>
                  <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '560px', flexDirection: isMobile ? 'column' : 'row' }}>
                    <input
                      type="text"
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      value={calendarSyncUrl}
                      onChange={(e) => setCalendarSyncUrl(e.target.value)}
                      style={{ flex: 1, padding: '0.75rem 1.25rem' }}
                      className="glass-input"
                    />
                    <button className="action-btn" onClick={handleSaveCalendarSync} style={{ whiteSpace: 'nowrap' }}>{t('add')}</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: isMobile ? '1fr' : '1fr 350px', gap: '2rem', flex: isMobile ? 'none' : 1, minHeight: isMobile ? 'auto' : 0 }}>
              <div className="glass-card" style={{ padding: isMobile ? '1.25rem' : '2rem', overflowY: isMobile ? 'visible' : 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {bookingSchedule.length === 0 ? (
                      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                        <p>{t('noEventsToday') || 'No bookings scheduled for today.'}</p>
                      </div>
                    ) : (
                      bookingSchedule.sort((a,b) => {
                        const timeToMins = (t) => {
                          const [h, m] = t.split(' ')[0].split(':').map(Number);
                          const isPm = t.includes('PM') && h !== 12;
                          return (isPm ? h + 12 : (t.includes('AM') && h === 12 ? 0 : h)) * 60 + (m || 0);
                        };
                        return timeToMins(a.time) - timeToMins(b.time);
                      }).map((event, idx) => (
                        <div key={idx} onClick={() => isMobile && setSelectedScheduleEvent(event)} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: isMobile ? '1rem' : '1.5rem', 
                          padding: isMobile ? '1rem' : '1.25rem', 
                          background: activeTimerEvent?.id === event.id ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', 
                          borderRadius: '16px', 
                          border: `1px solid ${activeTimerEvent?.id === event.id ? 'rgba(16,185,129,0.3)' : 'var(--card-border)'}`,
                          borderLeft: `4px solid ${event.type === 'work' ? 'var(--accent-color)' : 'var(--warning-color)'}`,
                          cursor: isMobile ? 'pointer' : 'default',
                          userSelect: 'none'
                        }}>
                          <div style={{ width: isMobile ? '70px' : '80px', flexShrink: 0 }}>
                            <div style={{ fontWeight: '800', fontSize: isMobile ? '1rem' : '1.1rem' }}>{event.time}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{event.duration}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: event.status === 'busy' ? 'var(--error-color)' : 'var(--success-color)' }}></div>
                              {event.status.toUpperCase()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
                            {activeTimerEvent?.id === event.id ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleCheckOut(); }}
                                className="action-btn" 
                                style={{ margin: 0, padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', background: 'var(--success-color)', fontSize: '0.7rem' }}
                              >
                                {isMobile ? 'OUT' : 'CHECK-OUT'}
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleCheckIn(event); }}
                                className="action-btn" 
                                style={{ margin: 0, padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1rem', background: isTimerActive ? 'rgba(255,255,255,0.05)' : 'var(--accent-color)', fontSize: '0.7rem', opacity: isTimerActive ? 0.5 : 1 }}
                                disabled={isTimerActive}
                              >
                                {isMobile ? 'IN' : 'CHECK-IN'}
                              </button>
                            )}
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenBookingMenuId(openBookingMenuId === event.id ? null : event.id); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                                onMouseLeave={e => e.currentTarget.style.background='none'}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openBookingMenuId === event.id && (
                                <div
                                  style={{ position: 'absolute', right: 0, top: '100%', zIndex: 999, minWidth: '140px', background: '#1a1d27', border: '1px solid var(--card-border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: '0.35rem', marginTop: '4px' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button onClick={() => handleEditBooking(event)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'} onMouseLeave={e => e.currentTarget.style.background='none'}>
                                    ✏️ Upravit
                                  </button>
                                  <button onClick={() => handleDeleteBooking(event.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', padding: '0.5rem 0.75rem', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background='none'}>
                                    🗑 Smazat
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  
                  {isTimerActive && (
                    <div className="glass-card fade-in" style={{ marginTop: '2rem', padding: '1.5rem', background: timeLeft <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${timeLeft <= 0 ? '#ef4444' : '#10b981'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div className={`pulse-${timeLeft <= 0 ? 'red' : 'green'}`} style={{ width: '12px', height: '12px', borderRadius: '50%', background: timeLeft <= 0 ? '#ef4444' : '#10b981' }} />
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Safety Guard Active</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{activeTimerEvent?.title}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: timeLeft <= 0 ? '#ef4444' : 'white', fontFamily: 'monospace' }}>
                            {formatSafetyTime(timeLeft)}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{timeLeft <= 0 ? 'OVERTIME' : 'TIME REMAINING'}</div>
                        </div>
                      </div>
                      {timeLeft <= 0 && (
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                          <button
                            onClick={handleCheckOut}
                            disabled={isSafetyLoading}
                            className="action-btn"
                            style={{
                              margin: 0,
                              padding: '0.55rem 0.9rem',
                              fontSize: '0.72rem',
                              background: 'rgba(239, 68, 68, 0.25)',
                              border: '1px solid rgba(239, 68, 68, 0.55)',
                              color: '#fecaca',
                              opacity: isSafetyLoading ? 0.7 : 1,
                            }}
                          >
                            {isSafetyLoading ? 'SAVING...' : 'CHECK-OUT NOW'}
                          </button>
                          <button
                            onClick={handleSafetyImOk}
                            disabled={isSafetyLoading}
                            className="action-btn"
                            style={{
                              margin: 0,
                              padding: '0.55rem 0.9rem',
                              fontSize: '0.72rem',
                              background: 'rgba(16, 185, 129, 0.2)',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              color: '#86efac',
                              opacity: isSafetyLoading ? 0.7 : 1,
                            }}
                          >
                            {isSafetyLoading ? 'SAVING...' : "I'M OK (+10m)"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="var(--warning-color)" /> {t('recommendedSlots')}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {SAFETY_SUGGESTIONS.map(s => (
                      <div key={s} className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer', border: '1px solid var(--warning-color)', color: 'white' }}>{s}</div>
                    ))}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed var(--accent-color)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem' }}>{t('operatorTip')}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {t('operatorTipDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'web-profiles' && (
          <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1.5rem', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '900', background: 'linear-gradient(to right, #fff, var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                  {activeProfile?.name || '...'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{t('webProfilesDesc')}</p>
              </div>
              
              <div style={{ position: 'relative', width: '220px' }}>
                <select 
                  value={activeProfileId} 
                  onChange={(e) => setActiveProfileId(e.target.value)}
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid var(--card-border)', 
                    padding: '0.6rem 2.5rem 0.6rem 1rem', 
                    borderRadius: '12px', 
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    appearance: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {assignedProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, flexDirection: isMobile ? 'column' : 'row' }}>
              {/* Left Content Area (Gallery & Bio) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Image size={20} color="var(--accent-color)" /> {t('gallery')}</h3>
                  <>
                   <input type="file" id="photo-upload-input" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) alert((lang === 'cz' ? 'Foto vybráno: ' : 'Photo selected: ') + file.name);
                   }} />
                   <button className="action-btn" onClick={() => document.getElementById('photo-upload-input').click()} style={{ width: 'auto', padding: '0.5rem 1rem', marginTop: 0, fontSize: '0.8rem' }}>+ {t('uploadPhoto')}</button>
                 </>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('publicGalleryCap')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200)' }}></div>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200)' }}></div>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200)' }}></div>
                    </div>
                  </div>
                  {!isMobile && <div style={{ width: '1px', background: 'var(--card-border)' }}></div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)' }}>{t('privateGalleryCap')} (VIP)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                      <div className="placeholder-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200)' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <FileEdit size={20} color="var(--accent-color)" /> {t('biography')} & {t('services')}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                    <button onClick={() => setBioLang('EN')} style={{ padding: '6px 12px', border: 'none', background: bioLang === 'EN' ? 'var(--accent-color)' : 'transparent', color: bioLang === 'EN' ? 'white' : 'var(--text-secondary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>EN</button>
                    <button onClick={() => setBioLang('CZ')} style={{ padding: '6px 12px', border: 'none', background: bioLang === 'CZ' ? 'var(--accent-color)' : 'transparent', color: bioLang === 'CZ' ? 'white' : 'var(--text-secondary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>CZ</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div className="input-group-premium">
                    <label className="input-label-premium">{t('mottoLabel')}</label>
                    <input 
                      type="text" 
                      defaultValue={activeProfile?.bio || ''} 
                      className="note-input" 
                      style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '700', 
                        letterSpacing: '-0.01em',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
                      }}
                      placeholder="Enter a catchy headline..."
                    />
                  </div>
                  
                  <div className="input-group-premium">
                    <label className="input-label-premium">{t('fullBioLabel')}</label>
                    <textarea 
                      className="note-input custom-scrollbar" 
                      style={{ 
                        height: '220px', 
                        lineHeight: '1.6', 
                        fontSize: '1rem',
                        borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                        paddingBottom: '1rem'
                      }} 
                      value={bioText || activeProfile?.description || ''}
                      onChange={e => setBioText(e.target.value)}
                      placeholder={t('bioPlaceholder')}
                    ></textarea>
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                      <span>{t('bioFormattingNote')}</span>
                      <span style={{ color: 'var(--accent-color)' }}>128 / 2000</span>
                    </div>
                  </div>
                  
                  <button onClick={handleSaveBio} className="action-btn" style={{ width: 'fit-content', padding: '1rem 2.5rem', fontSize: '1rem', marginTop: '1rem', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)' }}>
                    {t('saveChanges')}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sync Area */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(5,7,10,0.6)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
                  <RefreshCw size={18} color="var(--success-color)" className={isSyncing ? "spin-animation" : ""} /> {t('syncStatus')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>AW</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>AdultWork.com</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('ukPrimary')}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${syncStatus.aw}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {syncStatus.aw === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.aw === 'synced' ? <Check size={10} /> : <X size={10} />)}
                      {syncStatus.aw.toUpperCase()}
                    </div>
                  </div>

                  <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>EG</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>EuroGirlsEscort</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('euWide')}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${syncStatus.ege}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {syncStatus.ege === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.ege === 'synced' ? <Check size={10} /> : <X size={10} />)}
                      {syncStatus.ege.toUpperCase()}
                    </div>
                  </div>

                  <div className="sync-platform-row" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="platform-icon" style={{ width: '28px', height: '28px', fontSize: '0.6rem' }}>TP</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.8rem' }}>ThePuntersB...</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('reviewSync')}</div>
                      </div>
                    </div>
                    <div className={`sync-badge ${syncStatus.tpb}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                      {syncStatus.tpb === 'syncing' ? <RefreshCw size={10} className="spin-animation" /> : (syncStatus.tpb === 'synced' ? <Check size={10} /> : <AlertTriangle size={10} />)}
                      {syncStatus.tpb.toUpperCase()}
                    </div>
                  </div>
                </div>

                {isSyncing ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '700' }}><span>{t('syncingProfileData')}</span><span>{syncProgress}%</span></div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${syncProgress}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.2s ease' }}></div>
                    </div>
                  </div>
                ) : (
                  <button onClick={handleSyncAll} className="action-btn" style={{ background: 'var(--success-color)', boxShadow: '0 5px 15px rgba(16, 185, 129, 0.3)' }}><RefreshCw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> {t('syncAll')}</button>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'device-setup' && (
          <div style={{ padding: isMobile ? '1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Smartphone size={isMobile ? 24 : 28} color="var(--accent-color)" /> {t('deviceSetup')}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('deviceSetupDesc')}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              {/* Nexus Relay Setup */}
              <div className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2.5rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '1.5rem' : '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                    <div style={{ width: isMobile ? '48px' : '64px', height: isMobile ? '48px' : '64px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Smartphone size={isMobile ? 24 : 32} color="#60a5fa" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', marginBottom: '0.25rem' }}>{t('nexusRelayTitle')}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('nexusRelayDesc')}</p>
                    </div>
                  </div>
                  
                  <a 
                    href={relayApkInfo?.available ? relayApkInfo.downloadUrl : `${API_BASE.replace(/\/api$/, '')}/downloads/nexus-relay.apk`} 
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', 
                      color: 'white', 
                      padding: isMobile ? '0.75rem 1.25rem' : '1rem 2rem', 
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: '800',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                      fontSize: isMobile ? '0.85rem' : '1rem',
                      width: isMobile ? '100%' : 'auto',
                      justifyContent: 'center'
                    }}
                    onClick={async (e) => {
                      if (!relayApkInfo) {
                        try {
                          const token = localStorage.getItem('nexus_token');
                          const r = await fetch(`${API_BASE}/vultr/apk-info`, { headers: { Authorization: `Bearer ${token}` } });
                          const d = await r.json();
                          setRelayApkInfo(d);
                        } catch {}
                      }
                    }}
                  >
                    <Download size={20} /> {t('downloadApp')} (v{relayApkInfo?.version || '0.1'})
                  </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem', borderTop: '1px solid var(--card-border)', paddingTop: '2rem' }}>
                   <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#60a5fa', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('webhookLabel')}</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>{t('proxyNote')}</p>
                    <code style={{ fontSize: '0.9rem', color: '#60a5fa', wordBreak: 'break-all', display: 'block', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                      {`${API_BASE}/device/relay`}
                    </code>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--accent-color)' }}>{t('relayGuideTitle')}</div>
                    {[1, 2, 3, 4, 5, 6].map(step => (
                      <div key={step} style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ minWidth: '24px', height: '24px', background: 'rgba(96, 165, 250, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', color: '#60a5fa' }}>{step}</div>
                        <div style={{ fontSize: '0.9rem' }}>{t(`relayStep${step}`)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ marginTop: '2rem', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Zap size={20} color="var(--accent-color)" /> {t('whyTheseApps')}
              </h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                <li><strong>{t('safetyLabel')}:</strong> {t('safetyReason')}</li>
                <li><strong>{t('stabilityLabel')}:</strong> {t('stabilityReason')}</li>
                <li><strong>{t('flexibilityLabel')}:</strong> {t('flexibilityReason')}</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'hierarchy' && isAllowed('hierarchy') && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('teamHierarchy')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>{t('teamHierarchyDesc')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {operators.filter(op => {
                if (activeRole === 'App Owner') return true;
                return op.agencyId === activeOperator?.agencyId;
              }).map(op => {
                const assignedModels = profiles.filter(p => (p.operators || p.assignees || []).some(o => o.id === op.id || o === op.id));
                const agency = agencies.find(a => a.id === op.agencyId);
                return (
                  <div key={op.id} className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: isMobile ? '48px' : '60px', height: isMobile ? '48px' : '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                          {op.avatar}
                        </div>
                        <div>
                          <h3 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800' }}>
                            {op.name}
                            {activeRole === 'App Owner' && agency && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '400', marginLeft: '0.5rem' }}>
                                ({agency.name})
                              </span>
                            )}
                          </h3>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{op.role === 'Night Shift' ? t('nightShift') : op.role} • {assignedModels.length} {t('assignedModels')}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto', paddingTop: isMobile ? '1rem' : 0, borderTop: isMobile ? '1px solid var(--card-border)' : 'none' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>{t('todaysPerformance')}</div>
                        <div style={{ display: 'flex', gap: '2.5rem' }}>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{op.metrics?.messages || 0}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t('messages').toUpperCase()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{op.metrics?.conversion || '0%'}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('conversion') || 'CONV.').toUpperCase()}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                      {assignedModels.map(model => (
                        <div key={model.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '36px', height: '36px', background: 'var(--accent-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '0.75rem' }}>
                            {model.username?.substring(0,2).toUpperCase() || model.name.substring(0,2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{model.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: model.status === 'online' ? 'var(--success-color)' : 'var(--text-secondary)' }} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{(t(model.status) || 'OFFLINE').toString().toUpperCase()}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{model.unreadCount || 0}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{(t('unread') || 'UNREAD').toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('referralProgram')}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{t('referralsSubtitle')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              {[
                { label: (t('clicks') || '').toUpperCase(), value: 0, icon: Activity, color: '#3b82f6' },
                { label: (t('signups') || '').toUpperCase(), value: 0, icon: UserPlus, color: '#10b981' },
                { label: (t('earned') || '').toUpperCase(), value: '£0', icon: Trophy, color: '#f59e0b' },
                { label: (t('pending') || '').toUpperCase(), value: '£0', icon: Clock, color: 'var(--text-secondary)' }
              ].map((stat, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <stat.icon size={18} color={stat.color} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{stat.label}</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '900' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ flex: 1, padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link size={20} color="#f59e0b" /> {t('referralLinkHeader')}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  {t('referralLinkDesc')}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)', fontFamily: 'monospace', fontSize: '0.9rem', color: '#f59e0b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {'https://nexus.sync/ref/' + (activeOperator?.id || 'default')}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText('https://nexus.sync/ref/' + (activeOperator?.id || 'default')).then(() => alert(lang === 'cz' ? 'Odkaz zkopírován ✓' : 'Link copied ✓'))} className="action-btn" style={{ width: 'auto', padding: '0 1.5rem', marginTop: 0, background: 'var(--accent-color)' }}>
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="glass-card" style={{ width: isMobile ? '100%' : '400px', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem' }}>{t('whyRefer')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={18} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{t('recurringCommission')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('recurringCommissionDesc')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={18} color="#3b82f6" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{t('instantCredits')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('instantCreditsDesc')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{t('activeReferralsHistory')}</h3>
              </div>
              <div style={{ padding: '0 1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>
                      <th style={{ padding: '1.25rem 1rem' }}>{t('entity').toUpperCase()}</th>
                      <th style={{ padding: '1.25rem 1rem' }}>{t('date').toUpperCase()}</th>
                      <th style={{ padding: '1.25rem 1rem' }}>{t('status').toUpperCase()}</th>
                      <th style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>{t('reward').toUpperCase()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([]).map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ fontWeight: '700' }}>{item.entity}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: REF-{item.id}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem' }}>{item.date}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            ACTIVE
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: '800', color: '#f59e0b' }}>£0</td>
                      </tr>
                    ))}
                    {true && (
                      <tr>
                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {t('noReferralActivity')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
        {activeTab === 'profiles' && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '800' }}>{t('managedProfiles')}</h2>
              {(activeRole === 'App Owner' || activeRole === 'Agency Manager' || activeRole === 'Agency Admin' || activeOperator?.role?.isManager) && (
                <button
                  onClick={async () => {
                    const name = window.prompt(lang === 'cz' ? 'Jméno nového profilu (pracovní jméno):' : 'New profile name (stage name):');
                    if (!name) return;
                    const phone = window.prompt(lang === 'cz' ? 'Telefonní číslo (nebo ponech prázdné):' : 'Phone number (or leave empty):') || '';
                    try {
                      const resp = await axios.post(`${API_BASE}/profiles`, { name, phoneNumber: phone || null }, { headers: { Authorization: `Bearer ${token}` } });
                      setProfiles(prev => [...prev, resp.data]);
                      showToast(lang === 'cz' ? `Profil "${name}" byl vytvořen` : `Profile "${name}" created`, 'success');
                    } catch (e) { showToast('Failed to create profile', 'error'); }
                  }}
                  style={{ padding: '0.75rem 1.25rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  + {lang === 'cz' ? 'Přidat profil' : 'Add Profile'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {allAgencyProfiles.map((profile, i) => {
                const isMyProfile = myProfiles.find(p => p.id === profile.id);
                const activeCount = (profile.operators?.filter(op => op.active).length || 0) + (profile.assignees?.length || 0);

                return (
                  <div key={i} className="glass-card" style={{ padding: isMobile ? '1.5rem' : '2rem', display: 'flex', gap: isMobile ? '1.5rem' : '2.5rem', borderColor: isMyProfile ? 'rgba(59, 130, 246, 0.4)' : 'var(--card-border)', flexDirection: isMobile ? 'column' : 'row' }}>
                    <div style={{ flex: isMobile ? '1 1 auto' : '0 0 250px' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>{profile.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: activeCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: activeCount > 0 ? 'var(--success-color)' : 'var(--error-color)', fontSize: '0.7rem', fontWeight: '900', border: '1px solid currentColor' }}>
                          {activeCount > 0 ? `${activeCount} ${t('operatorsActive')}` : t('noCoverage')}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleOperatorStatus(profile.id, activeOperator?.id)}
                        className={`action-btn ${isMyProfile ? 'active' : ''}`}
                        style={{ background: isMyProfile ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent-color)', color: isMyProfile ? 'var(--error-color)' : 'white' }}
                      >
                        {isMyProfile ? t('deactivateMySeat') : t('activateMySeat')}
                      </button>
                      <button
                        onClick={() => handleEditProfile(profile)}
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--accent-color)', background: 'rgba(59, 130, 246, 0.1)', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <Settings size={16} /> {t('editProfile')}
                      </button>
                      <button
                        onClick={() => {
                          setActiveProfileId(profile.id);
                          setActiveTab('inbox');
                        }}
                        style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {t('openContext')}
                      </button>

                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('assignedTeam') || 'PROTECTIVE TEAM / ASSIGNEES'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {(profile.assignees || profile.operators || []).map(profileOp => {
                          const opData = operators.find(o => o.id === profileOp.id);
                          const displayName = opData?.name || profileOp.name || profileOp.id;
                          const displayRole = opData?.role || '';
                          return (
                            <div key={profileOp.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ width: '32px', height: '32px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '900' }}>{(opData?.avatar) || displayName.substring(0,2).toUpperCase()}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{displayName}</div>
                                {displayRole && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{displayRole}</div>}
                              </div>
                              <ShieldCheck size={16} color="var(--accent-color)" />
                            </div>
                          );
                        })}
                        <div 
                          onClick={() => setAssigningProfile(profile)}
                          style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '15px', border: '1px dashed var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--accent-color)' }}
                        >
                           <UserPlus size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{t('manageTeam') || 'Manage Team'}</span>
                         </div>
                      </div>
                    </div>

                    {/* Quick Replies for this profile */}
                    {(profile.quickReplies || []).length > 0 && (
                      <div style={{ marginTop: isMobile ? '1.5rem' : 0, flex: '0 0 auto', minWidth: isMobile ? '100%' : '220px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#10b981', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>RYCHLÉ ODPOVĚDI</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(profile.quickReplies || []).map(reply => (
                            <div key={reply.id} style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981' }}>{reply.label}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{reply.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simple Inline User Selection Modal (as a sibling for easier coding) */}
                    {assigningProfile?.id === profile.id && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Assign Operators to {profile.name}</h3>
                                    <button onClick={() => setAssigningProfile(null)} style={{ background: 'transparent', border: 'none', color: 'white' }}><X size={24} /></button>
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                                    {operators.filter(op => !op.isAppOwner && op.role !== 'Model').map(op => {
                                        const isAssigned = profile.assignees?.some(a => a.id === op.id) || profile.operators?.some(o => o.id === op.id);
                                        return (
                                            <div 
                                                key={op.id} 
                                                onClick={() => {
                                                    const current = profile.assignees?.map(a => a.id) || [];
                                                    const next = current.includes(op.id) ? current.filter(id => id !== op.id) : [...current, op.id];
                                                    handleSaveAssignees(profile.id, next);
                                                }}
                                                style={{ 
                                                    padding: '1rem', 
                                                    background: isAssigned ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', 
                                                    borderRadius: '12px', 
                                                    border: `1px solid ${isAssigned ? 'var(--accent-color)' : 'var(--card-border)'}`, 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{op.avatar}</div>
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{op.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{op.role}</div>
                                                    </div>
                                                </div>
                                                {isAssigned ? <CheckCircle size={20} color="var(--accent-color)" /> : <PlusCircle size={20} color="var(--text-secondary)" />}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button 
                                    onClick={() => setAssigningProfile(null)}
                                    className="action-btn" 
                                    style={{ background: 'var(--accent-color)', color: 'white', width: '100%', margin: 0 }}
                                >
                                    DONE
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }} className="fade-in custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2.5rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : 0 }}>
              <div><h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: '800' }}>{t('auditTrail')} - {activeClient?.name || t('system')}</h2><p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}>{t('auditSubtitle')}</p></div>
              <div className="status-badge" style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}><Shield size={14} /> {t('encryptedLog')}</div>
            </div>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {auditLogs.filter(log => availableOperators.some(op => op.name === log.operator)).map(log => (
                  <div key={log.id} className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{log.timestamp}</span>
                      <code className="hash-code" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{log.hash}</code>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '0.5rem' }}>{log.action}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <User size={12} /> {log.operator}
                      </div>
                      {log.profile !== 'N/A' && <div className="status-badge-small" style={{ fontSize: '0.65rem' }}>{log.profile}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                    {[t('timestamp'), t('event'), t('handledBy'), t('target'), t('hash')].map(h => <th key={h} style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{auditLogs.filter(log => availableOperators.some(op => op.name === log.operator)).map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                      <td style={{ padding: '1.25rem', fontWeight: '700' }}>{log.action}</td>
                      <td style={{ padding: '1.25rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} /> {log.operator}</div></td>
                      <td style={{ padding: '1.25rem' }}>{log.profile !== 'N/A' ? <div className="status-badge-small">{log.profile}</div> : '-'}</td>
                      <td style={{ padding: '1.25rem' }}><code className="hash-code">{log.hash}</code></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>{t('controlCenter')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>{t('configSubtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '800px' }}>
              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={20} color="var(--accent-color)" /> {t('agencyInsight')}: {activeClient?.name || t('global')}</h3>
                <div className="grid" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('teamSeats')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{availableOperators.length} / 10</div>
                  </div>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('regionalReach')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{activeClient?.region || t('global')}</div>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Smartphone size={20} color="var(--accent-color)" /> {t('sessionTopology')}</h3>
                <div className="glass-card" style={{ padding: 0 }}>
                  {(() => {
                    const isManager = activeRole === 'App Owner' || activeRole === 'Agency Admin' || activeRole === 'Agency Manager' || activeOperator?.role?.isManager;
                    // Operators see all devices in their agency; managers see all
                    const visibleSessions = sessions.filter(s => {
                      if (isManager) return true;
                      // Operator: show sessions for profiles in same agency
                      const sessionProfile = profiles.find(p => p.id === s.profileId);
                      return sessionProfile?.agencyId === activeOperator?.agencyId;
                    });
                    if (visibleSessions.length === 0) return (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('noDevicesConnected') || 'No active device bindings found.'}</div>
                    );
                    return visibleSessions.map((s, i) => (
                    <div key={i} style={{ padding: '1.5rem', borderBottom: i < visibleSessions.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    {!s.profileId && (
                      <div style={{ width: '100%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', marginBottom: '0.5rem' }}>
                        ⚠️ {lang === 'cz' ? 'Žádný profil přiřazen — SMS relay nefunguje. Přiřaďte profil a spárujte znovu.' : 'No profile assigned — SMS relay disabled. Assign a profile then re-pair.'}
                      </div>
                    )}
                      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ background: !s.profileId ? 'rgba(245,158,11,0.1)' : (s.current || s.status === 'Active') ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}><Smartphone size={20} color={!s.profileId ? '#f59e0b' : (s.current || s.status === 'Active') ? 'var(--accent-color)' : 'var(--text-secondary)'} /></div>
                        <div><div style={{ fontWeight: '700' }}>{s.device} {s.current && <span style={{ color: 'var(--success-color)', fontSize: '0.7rem' }}>({t('thisDevice')})</span>}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.location} • {s.status}</div></div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          title={lang === 'cz' ? 'Zobrazit polohu zařízení' : 'Show device location'}
                          onClick={() => {
                            if (s.lat && s.lng) {
                              window.open(`https://www.google.com/maps?q=${s.lat},${s.lng}`, '_blank');
                            } else {
                              showToast(lang === 'cz' ? 'Poloha momentálně není k dispozici' : 'Location not available', 'info');
                            }
                          }}
                          style={{ padding: '0.4rem 0.75rem', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          📍 {lang === 'cz' ? 'Poloha' : 'Location'}
                        </button>
                        {(isManager || s.profileId === activeOperator?.profileId) && (
                          <div
                            className="status-badge"
                            style={{ cursor: s.status === 'Active' ? 'pointer' : 'default', opacity: s.status === 'Active' ? 1 : 0.5 }}
                            onClick={() => s.status === 'Active' && handleRevokeBinding(s.installationId)}
                          >
                            {s.status === 'Active' ? t('revoke') : t('revoked') || 'REVOKED'}
                          </div>
                        )}
                      </div>
                    </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="settings-section">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20} color="var(--accent-color)" /> {t('safetyGuardHeading') || 'Safety Guard Configuration'}</h3>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '1rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0' }}>
                        <div>
                            <div style={{ fontWeight: '700' }}>{t('safetyAlertMode') || 'Emergency Alert Routing'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('safetyAlertModeDesc') || 'Choose who receives push notifications during a panic alert.'}</div>
                        </div>
                        <select 
                            value={agencySettings?.safetyAlertMode || 'MANAGERS_AND_ASSIGNED'}
                            onChange={(e) => updateAgencySettings({ safetyAlertMode: e.target.value })}
                            className="glass-input"
                            style={{ width: isMobile ? '100%' : 'auto', padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-color)', color: 'white', fontWeight: '700' }}
                        >
                            <option value="MANAGERS_AND_ASSIGNED">{t('modeManagersAndAssigned') || 'Managers + Assigned Operators'}</option>
                            <option value="ASSIGNED_ONLY">{t('modeAssignedOnly') || 'Strictly Assigned Operators Only'}</option>
                        </select>
                    </div>
                    {/* Departure Interval Setting */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.75rem' : '0' }}>
                      <div>
                        <div style={{ fontWeight: '700' }}>Interval odchodu klienta</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Modelka musí potvrdit odchod klienta do X minut po check-outu, jinak jde bezpečnostní alert.</div>
                      </div>
                      <select
                        value={departureIntervalMin}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          setDepartureIntervalMin(v);
                          localStorage.setItem('nexus_departure_interval', String(v));
                        }}
                        className="glass-input"
                        style={{ width: isMobile ? '100%' : 'auto', padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid var(--accent-color)', color: 'white', fontWeight: '700' }}
                      >
                        {[5, 10, 15, 20, 30].map(m => <option key={m} value={m}>{m} minut</option>)}
                      </select>
                    </div>
                </div>
              </div>

              {isAllowed('global_features') && (
                <div className="settings-section">
                  <h3 style={{ marginBottom: '1.5rem' }}>{t('simulationTools')}</h3>
                  <button onClick={simulateIncomingCall} className="action-btn" style={{ maxWidth: '300px' }}><Phone size={16} /> {t('simulateCall')}</button>
                </div>
              )}
            {isAllowed('analytics') && !isAllowed('infrastructure') && (
              <div className="glass-card" style={{ padding: '2rem', marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem' }}>{t('operatorPerformance')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {operators.filter(op => (activeRole === 'App Owner' || op?.agencyId === activeOperator?.agencyId) && op?.role?.name !== 'App Owner').map(op => (
                    <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--accent-color)' }}>{op.avatar}</div>
                        <div>
                          <div style={{ fontWeight: '700' }}>{op.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{op.role === 'Night Shift' ? t('nightShift') : op.role}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '3rem', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: '800' }}>{op.metrics?.messages || 0}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('messages') || 'MESSAGES').toUpperCase()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: '800' }}>{op.metrics?.calls || 0}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('calls') || 'CALLS').toUpperCase()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--success-color)' }}>{op.metrics?.conversion || '0%'}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{(t('convRate') || 'CONV. RATE').toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'qa' && (
          <QAView
            t={t}
            messages={messages}
            clientNotes={clientNotes}
            clientNames={clientNames}
            updateClientName={updateClientName}
            activeOperator={activeOperator}
            profiles={profiles}
            operators={operators}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView t={TRANSLATIONS[lang]} token={token} />
        )}

        {activeTab === 'infra' && isAllowed('infrastructure') && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', marginBottom: '0.5rem', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('infraTitle') || 'Infrastructure Control'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
              {t('infraSubtitle') || 'Global oversight of system health and core service stability.'}
            </p>
            <InfraTab t={t} />
          </div>
        )}

        {activeTab === 'agencies' && isAllowed('agencies') && (
          <div style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('agencyMgmtTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>{t('agencyMgmtSubtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Agency Manager */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={24} color="#8b5cf6" /> {t('portfolioManager')}
                  </h3>
                  <button
                    onClick={() => setIsAddAgencyModalOpen(true)}
                    className="action-btn"
                    style={{ width: 'auto', padding: '0.6rem 1.25rem' }}
                  >
                    {t('provisionNew')}
                  </button>
                </div>

                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {agencies.map((agency) => {
                      const agencyProfilesCount = profiles.filter(p => p.agencyId === agency.id).length;
                      const agencyOps = operators.filter(o => o.agencyId === agency.id);
                      return (
                        <div key={agency.id} className="glass-card" style={{ padding: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{agency.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('regionLabel')}: {agency.region}</div>
                            </div>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '6px',
                              background: agency.subscription.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: agency.subscription.status === 'active' ? 'var(--success-color)' : 'var(--error-color)',
                              fontSize: '0.7rem', fontWeight: '800'
                            }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                              {agency.subscription.status.toUpperCase()}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={16} color="var(--accent-color)" />
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{agencyProfilesCount}</div>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>PROFILES</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldCheck size={16} color="var(--accent-color)" />
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{agencyOps.length}</div>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>STAFF</div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{agency.subscription.plan.toUpperCase()} PLAN</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('nextRenewal')}: {agency.subscription.endDate}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setAgencies(prev => prev.map(a => a.id === agency.id ? { ...a, status: a.status === 'suspended' ? 'active' : 'suspended' } : a));
                                }}
                                className="status-badge"
                                style={{
                                  flex: 1, padding: '0.6rem', background: agency.status !== 'suspended' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: agency.status !== 'suspended' ? 'var(--success-color)' : 'var(--error-color)', border: 'none'
                                }}
                              >
                                {agency.status === 'suspended' ? t('unsuspend') : t('suspend')}
                              </button>
                              <button
                                onClick={() => {
                                  setOriginalOperator(activeOperator);
                                  setActiveClient(agency);
                                  const agencyOps = operators.filter(o => o.agencyId === agency.id);
                                  const best = agencyOps.find(o => o.role?.isManager || o.role?.name?.includes("Manager") || o.role?.name?.includes("Admin")) || agencyOps[0];
                                  if (best) setActiveOperator(best);
                                  setActiveTab('dashboard');
                                }}
                              >
                                {t('impersonate')}
                              </button>
                            </div>
                            <button
                              onClick={() => deleteAgency(agency.id)}
                              style={{ width: '100%', padding: '0.6rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--error-color)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800' }}
                            >
                              {t('delete').toUpperCase()}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-card custom-scrollbar" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                          <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('agencyRegion')}</th>
                          <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('status')}</th>
                          <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800' }}>{t('billingTier')}</th>
                          <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '800', textAlign: 'right' }}>{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agencies.map((agency, i) => {
                          const agencyProfilesCount = profiles.filter(p => p.agencyId === agency.id).length;
                          const agencyOps = operators.filter(o => o.agencyId === agency.id);
                          const subscription = agency.subscription || { status: 'active', plan: 'Pro', endDate: 'Unlimited' };
                          
                          return (
                            <tr key={agency.id} style={{ borderBottom: i < agencies.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                              <td style={{ padding: '1.25rem 1.5rem' }}>
                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{agency.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('regionLabel')}: {agency.region || 'EU'}</div>
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem' }}>
                                <div style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '6px',
                                  background: (subscription.status || 'active') === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: (subscription.status || 'active') === 'active' ? 'var(--success-color)' : 'var(--error-color)',
                                  fontSize: '0.7rem', fontWeight: '800'
                                }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                                  {(subscription.status || 'active').toUpperCase()}
                                </div>
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem' }}>
                                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{subscription.plan || 'Pro'} {t('planLabel')}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('nextRenewal')}: {subscription.endDate || 'N/A'}</div>
                              </td>
                              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => {
                                      // Toggle status logic
                                    }}
                                    className="status-badge"
                                    style={{
                                      background: agency.status !== 'suspended' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                      color: agency.status !== 'suspended' ? 'var(--success-color)' : 'var(--error-color)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {agency.status === 'suspended' ? t('unsuspend').toUpperCase() : t('suspend').toUpperCase()}
                                  </button>
                                  <button
                                    className="status-badge"
                                    style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', borderColor: 'var(--card-border)' }}
                                    onClick={() => setSelectedAgencyDetail(agency)}
                                  >
                                    DETAIL
                                  </button>
                                  <button
                                    className="status-badge"
                                    style={{ fontSize: '0.7rem', color: 'var(--accent-color)', cursor: 'pointer' }}
                                    onClick={() => {
                                      setOriginalOperator(activeOperator);
                                      setActiveClient(agency);
                                      // Pick best operator: prefer manager/admin, fallback to first
                                      const agencyOps = operators.filter(o => o.agencyId === agency.id);
                                      const best = agencyOps.find(o => o.role?.isManager || o.role?.name?.includes('Manager') || o.role?.name?.includes('Admin')) || agencyOps[0];
                                      if (best) setActiveOperator(best);
                                      setActiveTab('dashboard');
                                    }}
                                  >
                                    {t('impersonate')}
                                  </button>
                                  <button
                                    onClick={() => deleteAgency(agency.id)}
                                    className="status-badge"
                                    style={{ fontSize: '0.7rem', color: '#ef4444', borderColor: '#ef4444', cursor: 'pointer' }}
                                  >
                                    {t('delete').toUpperCase()}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && isAllowed('global_features') && (
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '100%' }} className="fade-in custom-scrollbar">
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(to right, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('featuresTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>{t('featuresSubtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Global Feature Provisioning */}
              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(5,7,10,0.4)', border: '1px dashed var(--accent-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Zap size={24} color="#f59e0b" /> {t('masterFeatureProvisioning')}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{t('systemCapabilities').toUpperCase()}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '2rem' }}>
                  {[
                    { id: 'ai_trans', label: 'Global AI Voice Relay', desc: 'Auto-provision secure voice corridors for phone simulation.', active: true },
                    { id: 'vc_hub', label: 'Cross-Agency Analytics', desc: 'Allow managers to view performance trends across multiple regions.', active: true },
                    { id: 'crm_adv', label: 'Enterprise Proxy Pooling', desc: 'Dynamic residential proxy allocation for enhanced privacy.', active: true },
                    { id: 'stats_bi', label: 'Automatic Payout Processing', desc: 'Scheduled generation of agency-wide billing reports.', active: false }
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--card-border)' }}>
                      <div>
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{feature.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feature.desc}</div>
                      </div>
                      <div
                        onClick={() => {}} // Local simulation
                        className={`toggle-switch ${feature.active ? 'active' : ''}`}
                        style={{
                          width: '40px', height: '20px', background: feature.active ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                          borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                          position: 'absolute', top: '2px', left: feature.active ? '22px' : '3px', transition: 'all 0.3s'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enterprise AI Training Simulation */}
              <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Cpu size={24} color="#a855f7" /> {t('aiTrainingEngine')}
                  </h3>
                  <div className="status-badge" style={{ borderColor: '#a855f7', color: '#a855f7' }}>{t('premiumModule').toUpperCase()}</div>
                </div>

                {!isTraining && trainingProgress === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🧠</div>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem' }}>{t('trainAiTitle')}</h4>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem' }}>
                      {t('trainAiDesc')}
                    </p>
                    <button
                      onClick={() => {
                        setIsTraining(true);
                        const interval = setInterval(() => {
                          setTrainingProgress(prev => {
                            if (prev >= 100) {
                              clearInterval(interval);
                              setIsTraining(false);
                              return 100;
                            }
                            return prev + 5;
                          });
                        }, 200);
                      }}
                      className="action-btn"
                      style={{ width: 'auto', padding: '1rem 2.5rem', background: 'var(--accent-color)' }}
                    >
                      {t('uploadTrainingSet')}
                    </button>
                  </div>
                )}

                {(isTraining || (trainingProgress > 0 && trainingProgress < 100)) && (
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '700' }}>
                      <span>{t('analyzingPatterns')}</span>
                      <span>{trainingProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${trainingProgress}%`, height: '100%', background: 'linear-gradient(to right, #6366f1, #a855f7)', transition: 'width 0.2s linear' }}></div>
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color="var(--success-color)" /> {t('dataValidated')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color={trainingProgress > 40 ? 'var(--success-color)' : 'var(--text-secondary)'} /> {t('patternExtraction')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={14} color={trainingProgress > 80 ? 'var(--success-color)' : 'var(--text-secondary)'} /> {t('weightOptimization')}</div>
                    </div>
                  </div>
                )}

                {trainingProgress === 100 && !isTraining && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'var(--success-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)' }}>
                      <Check size={32} color="white" strokeWidth={4} />
                    </div>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>{t('modelOptimizationComplete')}</h4>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      {t('aiModelUpdated', { agency: 'Elite Talent Management' })}
                    </p>
                    <button
                      onClick={() => setTrainingProgress(0)}
                      className="status-badge"
                      style={{ cursor: 'pointer', border: '1px solid var(--card-border)' }}
                    >
                      {t('resetTrainingEnv')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Permissions Dashboard (Phase 3) */}
        {activeTab === 'permissions' && isAllowed('permissions') && (
          <PermissionsDashboard
            t={t}
            activeOperator={activeOperator}
            onUpdate={fetchUserPermissions}
          />
        )}

        {/* Subscription / Billing */}
        {activeTab === 'plans' && isAllowed('plans') && (() => {
          const PLANS = [
            { id: 'MONTHLY',     label: lang === 'cz' ? 'Měsíční'  : 'Monthly',     price: 990,   priceFmt: '990 Kč',    days: 30,  save: 0 },
            { id: 'SEMI_ANNUAL', label: lang === 'cz' ? 'Půlroční' : 'Semi-Annual', price: 5490,  priceFmt: '5 490 Kč',  days: 182, save: 8 },
            { id: 'ANNUAL',      label: lang === 'cz' ? 'Roční'    : 'Annual',      price: 9990,  priceFmt: '9 990 Kč',  days: 365, save: 16 },
          ];
          const now = new Date();
          const daysLeft = activeSubscription ? Math.max(0, Math.ceil((new Date(activeSubscription.expiresAt) - now) / 86400000)) : 0;
          const statusColor = !activeSubscription ? '#6b7280' : activeSubscription.status === 'ACTIVE' ? '#10b981' : activeSubscription.status === 'TRIAL' ? '#f59e0b' : '#ef4444';

          const handleStart = async (planId) => {
            setIsStartingSubscription(true);
            try {
              const r = await axios.post(`${API_BASE}/subscriptions/start`, { plan: planId }, { headers: { Authorization: `Bearer ${token}` } });
              setActiveSubscription(r.data);
              setSubscriptionHistory(prev => [r.data, ...prev]);
            } catch (e) { console.error(e); }
            finally { setIsStartingSubscription(false); }
          };
          const handleCancel = async () => {
            if (!window.confirm(lang === 'cz' ? 'Opravdu zrušit předplatné?' : 'Cancel subscription?')) return;
            try {
              await axios.post(`${API_BASE}/subscriptions/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
              setActiveSubscription(null);
            } catch (e) { console.error(e); }
          };

          return (
            <div className="fade-in" style={{ padding: isMobile ? '1.5rem 1rem' : '2rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Current status card */}
                <div className="glass-card" style={{ padding: '2rem', borderTop: `3px solid ${statusColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                        {lang === 'cz' ? 'AKTUÁLNÍ PŘEDPLATNÉ' : 'CURRENT SUBSCRIPTION'}
                      </div>
                      {activeSubscription ? (
                        <>
                          <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>{PLANS.find(p => p.id === activeSubscription.plan)?.label || activeSubscription.plan}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ background: `rgba(${statusColor === '#10b981' ? '16,185,129' : statusColor === '#f59e0b' ? '245,158,11' : '239,68,68'},0.15)`, color: statusColor, border: `1px solid ${statusColor}`, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800' }}>
                              {activeSubscription.status}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {lang === 'cz' ? 'Vyprší za' : 'Expires in'} <strong style={{ color: daysLeft <= 7 ? '#ef4444' : 'white' }}>{daysLeft} {lang === 'cz' ? 'dní' : 'days'}</strong>
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              ({new Date(activeSubscription.expiresAt).toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-GB')})
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {lang === 'cz' ? 'Žádné aktivní předplatné' : 'No active subscription'}
                        </div>
                      )}
                    </div>
                    {activeSubscription && (
                      <button onClick={handleCancel} style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
                        {lang === 'cz' ? 'Zrušit' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Plan picker */}
                <div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={18} color="var(--accent-color)" /> {lang === 'cz' ? 'Vybrat / obnovit plán' : 'Select / renew plan'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
                    {PLANS.map(plan => {
                      const isActive = activeSubscription?.plan === plan.id && activeSubscription?.status === 'ACTIVE';
                      return (
                        <div key={plan.id} className="glass-card" style={{ padding: '1.5rem', border: isActive ? '2px solid var(--accent-color)' : '1px solid var(--card-border)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {isActive && <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'var(--accent-color)', color: 'white', padding: '0.18rem 0.55rem', borderRadius: '6px', fontSize: '0.62rem', fontWeight: '900' }}>AKTIVNÍ</div>}
                          {plan.save > 0 && <div style={{ position: 'absolute', top: isActive ? '2.2rem' : '0.75rem', right: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '0.18rem 0.55rem', borderRadius: '6px', fontSize: '0.6rem', fontWeight: '900' }}>-{plan.save}%</div>}
                          <div>
                            <div style={{ fontWeight: '900', fontSize: '1rem', marginBottom: '0.2rem' }}>{plan.label}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{plan.days} {lang === 'cz' ? 'dní' : 'days'}</div>
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-color)' }}>{plan.priceFmt}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            ≈ {Math.round(plan.price / plan.days * 30)} Kč / {lang === 'cz' ? 'měsíc' : 'month'}
                          </div>
                          <button onClick={() => handleStart(plan.id)} disabled={isStartingSubscription || isActive} style={{ marginTop: 'auto', padding: '0.6rem', borderRadius: '10px', background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--accent-color)', color: isActive ? 'var(--accent-color)' : 'white', border: isActive ? '1px solid rgba(59,130,246,0.3)' : 'none', fontWeight: '800', fontSize: '0.8rem', cursor: isActive ? 'default' : 'pointer', opacity: isStartingSubscription ? 0.5 : 1 }}>
                            {isActive ? (lang === 'cz' ? '✓ Aktivní' : '✓ Active') : (lang === 'cz' ? 'Aktivovat' : 'Subscribe')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* History */}
                {subscriptionHistory.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '800' }}>{lang === 'cz' ? 'Historie' : 'History'}</h3>
                    <div className="glass-card" style={{ overflow: 'hidden' }}>
                      {subscriptionHistory.map((s, i) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < subscriptionHistory.length - 1 ? '1px solid var(--card-border)' : 'none', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{PLANS.find(p => p.id === s.plan)?.label || s.plan}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{new Date(s.startedAt).toLocaleDateString()} → {new Date(s.expiresAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {s.amountPaid != null && <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{s.amountPaid} {s.currency}</div>}
                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '5px', fontSize: '0.62rem', fontWeight: '800', background: s.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : s.status === 'TRIAL' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', color: s.status === 'ACTIVE' ? '#10b981' : s.status === 'TRIAL' ? '#f59e0b' : 'var(--text-secondary)' }}>{s.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketing pricing plans below */}
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '2rem' }}>
                  <PlansDashboard lang={lang} t={t} subscriptionPlans={subscriptionPlans} activeMarket={activeMarket} setActiveMarket={setActiveMarket} activeOperator={activeOperator} currentAgency={currentAgency} />
                </div>
              </div>
            </div>
          );
        })()}


        {/* Removed redundant QA Hub block */}
      </main>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', border: '1px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={28} color="var(--accent-color)" /> {t('createBooking')}
              </h2>
              <X size={24} color="var(--text-secondary)" cursor="pointer" onClick={() => setIsBookingModalOpen(false)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('clientAndGirl').toUpperCase()}</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', display: 'flex', gap: '1rem' }}>
                   <div style={{ fontWeight: '700' }}>{selectedChat?.from || 'Unknown Client'}</div>
                   <div style={{ color: 'var(--text-secondary)' }}>→</div>
                   <div style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{activeProfile?.name || '...'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('date').toUpperCase()}</label>
                  <input type="date" value={bookingDetails.date} onChange={(e) => setBookingDetails({...bookingDetails, date: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '12px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('time').toUpperCase()}</label>
                  <input type="time" value={bookingDetails.time} onChange={(e) => setBookingDetails({...bookingDetails, time: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '12px', color: 'white' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('duration').toUpperCase()}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['30', '60', '90', '120'].map(mins => (
                    <button key={mins} onClick={() => setBookingDetails({...bookingDetails, duration: mins})} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid', borderColor: bookingDetails.duration === mins ? 'var(--accent-color)' : 'var(--card-border)', background: bookingDetails.duration === mins ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: bookingDetails.duration === mins ? 'white' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}>{mins}m</button>
                  ))}
                </div>
              </div>

              {bookingCollision && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', borderRadius: '12px', display: 'flex', gap: '0.75rem' }}>
                  <AlertTriangle size={20} color="var(--error-color)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ color: 'var(--error-color)', fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{t('collisionDetected').toUpperCase()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('overlapsWith')}: <strong>{bookingCollision.title} ({bookingCollision.time})</strong></div>
                    <button
                      onClick={() => {
                        // Simple logic for next slot: exact end of collision
                        const [h, m] = bookingCollision.time.split(' ')[0].split(':').map(Number);
                        const isPm = bookingCollision.time.includes('PM') && h !== 12;
                        const hCorrected = isPm ? h + 12 : (bookingCollision.time.includes('AM') && h === 12 ? 0 : h);
                        const dur = parseFloat(bookingCollision.duration) * 60;
                        const startTotal = hCorrected * 60 + (m || 0);
                        const endTotal = startTotal + dur;
                        const nextH = Math.floor(endTotal / 60);
                        const nextM = endTotal % 60;
                        const nextTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
                        setBookingDetails({...bookingDetails, time: nextTime});
                        setBookingCollision(null);
                      }}
                      style={{ marginTop: '0.75rem', background: 'white', color: 'black', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      MOVE TO NEXT SLOT
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmBooking}
                className="action-btn"
                style={{ background: bookingCollision ? 'rgba(255,255,255,0.1)' : 'var(--accent-color)', color: 'white', marginTop: '1rem', opacity: bookingCollision ? 0.5 : 1 }}
                disabled={!!bookingCollision}
              >
                {t('confirmBooking').toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Icon & Title */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚪</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.4rem' }}>Opustil klient bezpečně?</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prosím potvrď, že klient odešel. Jinak bude odeslán bezpečnostní alert.</div>
            </div>
            {/* Countdown */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', fontFamily: 'monospace', color: departureTimeLeft < 60 ? '#ef4444' : '#10b981' }}>
                {String(Math.floor(departureTimeLeft / 60)).padStart(2, '0')}:{String(departureTimeLeft % 60).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>DO AUTOMATICKÉHO ALERTU</div>
            </div>
            {/* Confirm button */}
            <button
              onClick={handleDepartureConfirmed}
              style={{ width: '100%', padding: '1.1rem', borderRadius: '16px', background: '#10b981', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', marginBottom: '0.75rem', letterSpacing: '0.03em' }}
            >
              ✓ Klient odešel bezpečně
            </button>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Interval: {departureIntervalMin} min · Nastavitelné v Nastavení
            </div>
          </div>
        </div>
      )}

            {/* Mobile Schedule Bottom Sheet */}
      {isMobile && selectedScheduleEvent && (
        <div
          onClick={() => setSelectedScheduleEvent(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg-secondary, #0f1117)', borderRadius: '24px 24px 0 0', padding: '1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
          >
            {/* Handle */}
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 1.25rem' }} />
            {/* Event info */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.3rem' }}>{selectedScheduleEvent.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>🕐 {selectedScheduleEvent.time}</span>
                <span>⏱ {selectedScheduleEvent.duration}</span>
                <span style={{ color: activeTimerEvent?.id === selectedScheduleEvent.id ? '#10b981' : 'var(--text-secondary)' }}>
                  {activeTimerEvent?.id === selectedScheduleEvent.id ? '● ACTIVE' : selectedScheduleEvent.status?.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Action buttons */}
            {activeTimerEvent?.id === selectedScheduleEvent.id ? (
              <button
                onClick={() => { handleCheckOut(); setSelectedScheduleEvent(null); }}
                disabled={isSafetyLoading}
                style={{ width: '100%', padding: '1.1rem', borderRadius: '16px', background: '#10b981', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', letterSpacing: '0.05em', marginBottom: '0.75rem' }}
              >
                ✓ CHECK-OUT
              </button>
            ) : (
              <button
                onClick={() => { handleCheckIn(selectedScheduleEvent); setSelectedScheduleEvent(null); }}
                disabled={isTimerActive}
                style={{ width: '100%', padding: '1.1rem', borderRadius: '16px', background: isTimerActive ? 'rgba(255,255,255,0.06)' : 'var(--accent-color)', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: '900', cursor: isTimerActive ? 'not-allowed' : 'pointer', opacity: isTimerActive ? 0.5 : 1, letterSpacing: '0.05em', marginBottom: '0.75rem' }}
              >
                ▶ CHECK-IN
              </button>
            )}
            <button
              onClick={() => setSelectedScheduleEvent(null)}
              style={{ width: '100%', padding: '0.85rem', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Zavřít
            </button>
          </div>
        </div>
      )}


      {/* Panic Confirmation Modal */}
      {showPanicConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', border: '2px solid #ef4444' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem', animation: 'bounce 1s infinite' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'white', marginBottom: '1rem' }}>EMERGENCY ALERT?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>This will immediately dispatch emergency signals to all agency managers. Use only in real danger.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={() => setShowPanicConfirm(false)} 
                className="glass-card" 
                style={{ padding: '1rem', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '700' }}
              >
                CANCEL
              </button>
              <button 
                onClick={() => { handlePanic(); setShowPanicConfirm(false); }} 
                className="action-btn" 
                style={{ background: '#ef4444', color: 'white', fontWeight: '900', margin: 0 }}
              >
                SEND SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Alert Overlay for Operators/Managers */}
      {emergencyAlert && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '3.5rem', textAlign: 'center', border: '5px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)', boxShadow: '0 0 50px rgba(239, 68, 68, 0.5)' }}>
                  <div className="pulse-red" style={{ margin: '0 auto 2.5rem', width: '120px', height: '120px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={70} color="white" />
                  </div>
                  
                  <h1 style={{ fontSize: '3rem', fontWeight: '900', color: 'white', marginBottom: '1rem', letterSpacing: '-1px' }}>EMERGENCY</h1>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ef4444', marginBottom: '2rem' }}>{emergencyAlert.profileName}</h2>
                  
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '20px', marginBottom: '3rem', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>Event Type:</span>
                          <span style={{ fontWeight: '800', color: 'white', wordBreak: 'break-word', textAlign: 'right' }}>{emergencyAlert.type?.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: (emergencyAlert.notes || emergencyAlert.message) ? '1rem' : 0 }}>
                          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>Session ID:</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'right' }}>#{emergencyAlert.sessionId}</span>
                      </div>
                      {(emergencyAlert.notes || emergencyAlert.message) && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Notes</div>
                              <div style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                  {emergencyAlert.notes || emergencyAlert.message}
                              </div>
                          </div>
                      )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                      <button
                          onClick={handleManagerEmergencyAcknowledge}
                          disabled={isEmergencyAckLoading}
                          className="action-btn"
                          style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.55)', color: '#86efac', fontWeight: '900', fontSize: '1rem', padding: '1rem', margin: 0, opacity: isEmergencyAckLoading ? 0.7 : 1 }}
                      >
                          {isEmergencyAckLoading ? 'ACKNOWLEDGING...' : 'ACKNOWLEDGE SAFE (+10m)'}
                      </button>
                      <button
                          onClick={() => setEmergencyAlert(null)}
                          className="action-btn" 
                          style={{ background: 'white', color: '#ef4444', fontWeight: '900', fontSize: '1.2rem', padding: '1.5rem', margin: 0 }}
                      >
                          ACKNOWLEDGE & DISMISS
                      </button>
                  </div>
              </div>
          </div>
      )}
      {!isBugReportOpen && !isMobile && (
        <button
          onClick={() => setIsBugReportOpen(true)}
          style={{
            position: 'fixed',
            bottom: isMobile ? 'max(1rem, calc(env(safe-area-inset-bottom) + 1rem))' : '2rem',
            right: isMobile ? 'max(1rem, calc(env(safe-area-inset-right) + 1rem))' : '2rem',
            width: '50px', height: '50px',
            borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1000,
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)', transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
        >
          <Bug size={ 24 } color="#ef4444" />
        </button>
      )}

      {/* Bug Report Modal */}
      {isBugReportOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bug size={24} color="#ef4444" /> {t('reportBugTitle')}
              </h2>
              <button onClick={() => setIsBugReportOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {t('bugReportSubtitle')}
            </p>

            <textarea
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder={t('bugPlaceholder')}
              style={{
                width: '100%', height: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)',
                borderRadius: '12px', padding: '1rem', color: 'white', fontSize: '0.9rem', resize: 'none', marginBottom: '1.5rem',
                outline: 'none'
              }}
            />

            <button
              onClick={() => {
                const subject = encodeURIComponent(`[BUG] Issue reported by ${activeOperator?.name || 'Unknown'}`);
                const body = encodeURIComponent(`Operator: ${activeOperator?.name || 'Unknown'}\nRole: ${activeOperator?.role || 'Unknown'}\nClient: ${activeClient?.name || 'App Owner'}\n\nDescription:\n${bugDescription}`);
                window.location.href = `mailto:support@nexus-hub.ai?subject=${subject}&body=${body}`;
                setIsBugReportOpen(false);
                setBugDescription('');
              }}
              className="action-btn"
              style={{ background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}
            >
              {t('reportToGithub')}
            </button>
          </div>
        </div>
      )}


      {/* Agency Detail Modal */}
      {selectedAgencyDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '2rem 2.5rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '0.25rem' }}>{selectedAgencyDetail.name}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.05em' }}>{selectedAgencyDetail.region?.toUpperCase()}</div>
              </div>
              <button 
                onClick={() => setSelectedAgencyDetail(null)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {selectedAgencyDetail.email && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>KONTAKTNÍ EMAIL</div>
                  <div style={{ fontWeight: '700' }}>{selectedAgencyDetail.email}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>PLÁN</div>
                  <div style={{ fontWeight: '700' }}>{selectedAgencyDetail.subscription?.plan || 'Standard'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>STAFF</div>
                  <div style={{ fontWeight: '700' }}>{operators.filter(o => o.agencyId === selectedAgencyDetail.id).length} uživatelů</div>
                </div>
              </div>

              {/* Manager Details */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>PRIMARY MANAGER</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800' }}>
                    {selectedAgencyDetail.managerName?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{selectedAgencyDetail.managerName || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedAgencyDetail.managerEmail || 'No email provided'}</div>
                  </div>
                </div>
              </div>

              {/* Action Button for Managing Roles (Moved Up) */}
              <button 
                onClick={() => {
                  setAgencyToManage(selectedAgencyDetail);
                  setIsAgencyRolesModalOpen(true);
                }}
                className="action-btn"
                style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontWeight: '800', width: '100%', marginBottom: '1.25rem', padding: '1rem', borderRadius: '12px' }}
              >
                <Shield size={18} color="var(--accent-color)" /> SPRAVOVAT ROLE AGENTURY
              </button>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>MANAŽER AGENTURY</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800' }}>
                      {selectedAgencyDetail.managerName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{selectedAgencyDetail.managerName || 'Neznámý'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedAgencyDetail.managerEmail || 'E-mail nedostupný'}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={14} color="white" />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-color)', letterSpacing: '0.1em' }}>INVITATION CODE</div>
                </div>
                
                {selectedAgencyDetail.inviteCode ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center' }}>
                      <code style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.1em', color: 'white', fontFamily: 'monospace' }}>
                        {selectedAgencyDetail.inviteCode}
                      </code>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(selectedAgencyDetail.inviteCode); showToast('Invite code copied!', 'success'); }}
                      style={{ height: '52px', padding: '0 1.25rem', background: 'var(--accent-color)', color: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Copy size={16} /> {lang === 'cz' ? 'KOPÍROVAT' : 'COPY'}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', border: '1px solid var(--card-border)' }}>
                    {lang === 'cz' ? 'Kód ještě nebyl vygenerován' : 'Code not generated yet'}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div style={{ padding: '1.5rem 2.5rem 2rem', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setSelectedAgencyDetail(null)} 
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                {lang === 'cz' ? 'Zavřít' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specific Agency Roles Management Modal */}
      {isAgencyRolesModalOpen && agencyToManage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1005, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '95%', maxWidth: '1280px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Individuální nastavení práv: {agencyToManage.name}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tyto změny ovlivní pouze role v rámci této konkrétní agentury (slouží pro bonusy a akce).</p>
              </div>
              <button 
                onClick={() => setIsAgencyRolesModalOpen(false)} 
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <PermissionsDashboard 
                t={t} 
                activeOperator={activeOperator} 
                agencyId={agencyToManage.id} 
                onUpdate={() => showToast('Práva agentury byla úspěšně aktualizována', 'success')}
              />
            </div>

            <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.3)' }}>
              <button 
                onClick={() => setIsAgencyRolesModalOpen(false)}
                className="action-btn"
                style={{ width: 'auto', padding: '0.8rem 2.5rem' }}
              >
                HOTOVO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New Agency Modal */}
      {isAddAgencyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('provisionAgency')}</h3>
              <button onClick={() => setIsAddAgencyModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('agencyName').toUpperCase()}</label>
                <input
                  type="text"
                  value={newAgencyData.name}
                  onChange={e => setNewAgencyData({...newAgencyData, name: e.target.value})}
                  placeholder="e.g. Diamond Stars UK"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('region').toUpperCase()}</label>
                <select
                  value={newAgencyData.region}
                  onChange={e => setNewAgencyData({...newAgencyData, region: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                >
                  <option value="UK/Europe">UK/Europe</option>
                  <option value="International">International</option>
                  <option value="US/North America">US/North America</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('subscriptionTier').toUpperCase()}</label>
                <select
                  value={newAgencyData.tier}
                  onChange={e => setNewAgencyData({...newAgencyData, tier: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                >
                  <option value="Standard">Standard</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>EMAIL AGENTURY</label>
                <input
                  type="email"
                  value={newAgencyData.email}
                  onChange={e => setNewAgencyData({...newAgencyData, email: e.target.value})}
                  placeholder="agency@example.com"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => setIsAddAgencyModalOpen(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>{t('cancel')}</button>
              <button onClick={addAgency} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('provision')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {bookingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800' }}>{lang === 'cz' ? 'Přidat akci do kalendáře' : 'Add Booking'}</h3>
              <button onClick={() => setBookingModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'NÁZEV' : 'TITLE'}</label>
                <input value={newBookingForm.title} onChange={e => setNewBookingForm(p => ({ ...p, title: e.target.value }))} placeholder={lang === 'cz' ? 'např. Schůzka s klientem' : 'e.g. Meeting with client'} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontSize: '0.95rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'DATUM' : 'DATE'}</label>
                <input type="date" value={newBookingForm.date} onChange={e => setNewBookingForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontSize: '0.95rem', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'TYP SCHŮZKY' : 'LOCATION TYPE'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => setNewBookingForm(p => ({ ...p, locationType: 'incall' }))}
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: '10px', 
                      border: '1px solid var(--card-border)', 
                      background: newBookingForm.locationType === 'incall' ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Incall
                  </button>
                  <button 
                    onClick={() => setNewBookingForm(p => ({ ...p, locationType: 'outcall' }))}
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: '10px', 
                      border: '1px solid var(--card-border)', 
                      background: newBookingForm.locationType === 'outcall' ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Outcall
                  </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  {newBookingForm.locationType === 'outcall' 
                    ? (lang === 'cz' ? '💡 Outcall: GPS tracking aktivní celou dobu.' : '💡 Outcall: GPS tracking active throughout.')
                    : (lang === 'cz' ? '🛡️ Incall: GPS tracking jen při emergency alertu.' : '🛡️ Incall: GPS tracking only on emergency.')}
                </p>
              </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'OD' : 'START'}</label>
                    <input type="time" value={newBookingForm.startTime} onChange={e => setNewBookingForm(p => ({ ...p, startTime: e.target.value }))} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontSize: '0.95rem', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{lang === 'cz' ? 'DO' : 'END'}</label>
                    <input type="time" value={newBookingForm.endTime} onChange={e => setNewBookingForm(p => ({ ...p, endTime: e.target.value }))} style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '10px', color: 'white', fontSize: '0.95rem', colorScheme: 'dark' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>{lang === 'cz' ? 'RYCHLÁ DOBA' : 'QUICK DURATION'}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {[15, 30, 45, 60, 90, 120].map(mins => {
                      const label = mins >= 60 ? `${mins / 60}h` : `${mins}m`;
                      return (
                        <button 
                          key={mins}
                          onClick={() => {
                            const [h, m] = newBookingForm.startTime.split(':').map(Number);
                            const start = new Date(2000, 0, 1, h, m);
                            const end = new Date(start.getTime() + mins * 60000);
                            setNewBookingForm(p => ({ ...p, endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}` }));
                          }}
                          style={{ 
                            padding: '0.4rem 0.6rem', 
                            borderRadius: '8px', 
                            border: '1px solid var(--card-border)', 
                            background: 'rgba(255,255,255,0.03)', 
                            color: 'white', 
                            fontSize: '0.7rem', 
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setBookingModalOpen(false)} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'transparent', color: 'white', fontWeight: '700', cursor: 'pointer' }}>{lang === 'cz' ? 'Zrušit' : 'Cancel'}</button>
                <button onClick={handleCreateBooking} disabled={!newBookingForm.title || !newBookingForm.date} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: '800', cursor: 'pointer', opacity: (!newBookingForm.title || !newBookingForm.date) ? 0.5 : 1 }}>{lang === 'cz' ? 'Uložit akci' : 'Save Booking'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && editingProfileData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('editProfile')}</h3>
              <button
                onClick={() => {
                  setIsEditProfileModalOpen(false);
                  setEditingProfileData(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('profileName').toUpperCase()}</label>
                  <input
                    type="text"
                    value={editingProfileData.name}
                    onChange={e => setEditingProfileData({...editingProfileData, name: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('phoneNumber').toUpperCase()}</label>
                  <input
                    type="text"
                    value={editingProfileData.phoneNumber || ''}
                    onChange={e => setEditingProfileData({...editingProfileData, phoneNumber: e.target.value})}
                    placeholder="+44 ..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{t('quickReplies').toUpperCase()}</label>
                  <button
                    onClick={() => {
                      const newReply = { id: `q-${Date.now()}`, label: 'New Reply', text: '' };
                      setEditingProfileData({
                        ...editingProfileData,
                        quickReplies: [...(editingProfileData.quickReplies || []), newReply]
                      });
                    }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    + {t('addQuickReply')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(editingProfileData.quickReplies || []).map((reply, index) => (
                    <div key={reply.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder={t('replyLabel')}
                          value={reply.label}
                          onChange={e => {
                            const newReplies = [...editingProfileData.quickReplies];
                            newReplies[index].label = e.target.value;
                            setEditingProfileData({ ...editingProfileData, quickReplies: newReplies });
                          }}
                          style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                        />
                        <button
                          onClick={() => {
                            const newReplies = editingProfileData.quickReplies.filter((_, i) => i !== index);
                            setEditingProfileData({ ...editingProfileData, quickReplies: newReplies });
                          }}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <textarea
                        placeholder={t('replyText')}
                        value={reply.text}
                        onChange={e => {
                          const newReplies = [...editingProfileData.quickReplies];
                          newReplies[index].text = e.target.value;
                          setEditingProfileData({ ...editingProfileData, quickReplies: newReplies });
                        }}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '6px', color: 'white', fontSize: '0.8rem', minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button
                onClick={() => {
                  setIsEditProfileModalOpen(false);
                  setEditingProfileData(null);
                }}
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}
              >
                {t('cancel')}
              </button>
              <button onClick={handleSaveProfile} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('saveProfileChanges')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Operator Modal */}
      {isAddOperatorModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{t('addTeamMember')}</h3>
              <button onClick={() => setIsAddOperatorModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('fullName').toUpperCase()}</label>
                <input
                  type="text"
                  value={newOperatorData.name}
                  onChange={e => setNewOperatorData({...newOperatorData, name: e.target.value})}
                  placeholder="e.g. John Doe"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('emailAddress').toUpperCase()}</label>
                <input
                  type="email"
                  value={newOperatorData.email}
                  onChange={e => setNewOperatorData({...newOperatorData, email: e.target.value})}
                  placeholder="operator@nexus.sync"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.6rem', letterSpacing: '0.1em' }}>{t('assignRole').toUpperCase()}</label>
                <select
                  value={newOperatorData.role}
                  onChange={e => setNewOperatorData({...newOperatorData, role: e.target.value})}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--card-border)', padding: '0.85rem', borderRadius: '12px', color: 'white' }}
                >
                  <option value="Model">{lang === 'cz' ? 'Modelka' : 'Model'}</option>
                  <option value="Operator">{lang === 'cz' ? 'Operátorka' : 'Operator'}</option>
                  <option value="Senior Operator">Senior Operator</option>
                  <option value="Agency Manager">{lang === 'cz' ? 'Manažer agentury' : 'Agency Manager'}</option>
                  {(activeRole === 'App Owner' || activeOperator?.role?.isManager) && (
                    <option value="Agency Admin">Agency Admin</option>
                  )}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => setIsAddOperatorModalOpen(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'white', borderRadius: '12px', fontWeight: '700' }}>{t('cancel')}</button>
              <button onClick={addOperator} className="action-btn" style={{ flex: 1, background: 'var(--accent-color)', color: 'white', fontWeight: '800' }}>{t('addToTeam')}</button>
            </div>
          </div>
        </div>
      )}
      {renderNotifications()}
      {renderNotificationPanel()}
    </div>
    );
  };

  return renderContent();
}

export default App;

