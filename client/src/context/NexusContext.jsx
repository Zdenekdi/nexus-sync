import React, { 
  useState, useEffect, useCallback, useMemo, useRef 
} from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../hooks/useAuth';
import { useNexusData } from '../hooks/useNexusData';
import { getSocket } from '../services/socketBridge';
import { ensurePhoneTracking, stopPhoneTracking } from '../services/phoneTracker';
import { setAppOwnerBypass, useFeatureLock, isFeatureLocked as isFeatureLockedNow } from '../config/featureLocks';
import { getOrCreateInstallationId } from '../utils/installationId';
import { AgencyDataGateway } from '../services/agency/AgencyDataGateway';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { ContentSyncService } from '../services/content/ContentSyncService';
import { CommunicationService } from '../services/communication/CommunicationService';
import { WhatsAppAdapter } from '../services/communication/WhatsAppAdapter';
import { SMSAdapter } from '../services/communication/SMSAdapter';
import { WebChatAdapter } from '../services/communication/WebChatAdapter';
import { TRANSLATIONS } from '../translations';
import { NexusContext } from './ContextObject';
import { usePermissions } from '../hooks/usePermissions';
import { useChatLogic } from '../hooks/useChatLogic';
import { useSocket } from '../hooks/useSocket';
import { initPushNotifications } from '../services/pushService';

// API Configuration
// IMPORTANT: Capacitor WebView ALWAYS reports hostname as 'localhost' even on a real device,
// so we MUST use Capacitor.isNativePlatform() to distinguish native apps from web dev.
const API_BASE = Capacitor.isNativePlatform()
  ? 'https://nexus-api.myvnc.com/api'
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://nexus-api.myvnc.com/api');

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

  const [pathname, setPathname] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');
  const [authInitialTab, setAuthInitialTab] = useState('login');

  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/en')) return 'en';
      if (path.startsWith('/cz')) return 'cz';
    }
    return getSafeStorage('nexus_lang', 'cz');
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('nexus_lang', newLang);
    } catch (_err) { /* ignore */ }


    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const cleanPath = currentPath.replace(/^\/(en|cz)/, '') || '/';
      
      let targetPath = cleanPath;
      if (newLang !== 'cz') {
        targetPath = `/${newLang}${cleanPath === '/' ? '' : cleanPath}`;
      }
      
      if (targetPath !== currentPath) {
        window.history.pushState(null, '', targetPath);
        setPathname(targetPath);
      }
    }
  }, []);
  
  const [activeMarket, _setActiveMarket] = useState(() => getSafeStorage('nexus_active_market', 'UK'));
  const setActiveMarket = useCallback((market) => {
    _setActiveMarket(market);
    try { localStorage.setItem('nexus_active_market', market); } catch { /* ignore */ }
  }, []);
  
  // Auth & Routing States (Moved up to prevent hoisting errors)

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
  const isNativeApp = Capacitor.isNativePlatform();
  
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
      return cleanPath === '/' || cleanPath === '/guide' || cleanPath === '/downloads';
    }
    return true;
  });

  const navigate = useCallback((path, authTab = 'login') => {
    if (typeof window === 'undefined') return;
    
    // If navigating to login/register/guide, set the auth tab if provided
    if (authTab) setAuthInitialTab(authTab);

    // Ensure language prefix is preserved (unless strictly root as requested)
    let targetPath = path;
    const clean = path.replace(/^\/(en|cz)/, '') || '/';

    if (clean === '/') {
      targetPath = '/';
      setShowLanding(true);
      setActiveTab('dashboard');
    } else if (lang !== 'cz' && !path.startsWith(`/${lang}`)) {
      targetPath = `/${lang}${path === '/' ? '' : path}`;
    }
    
    if (clean !== '/' && clean !== '/guide' && clean !== '/downloads') {
      setShowLanding(false);
    } else if (clean === '/guide' || clean === '/downloads') {
      setShowLanding(true);
    }

    window.history.pushState(null, '', targetPath);
    setPathname(targetPath);
  }, [lang]);

  // Sync showLanding and activeTab with pathname

  useEffect(() => {
    const p = pathname.replace(/^\/(en|cz)/, '') || '/';
    if (p === '/' || p === '/guide' || p === '/downloads') {
      setTimeout(() => {
        setShowLanding(true);
        if (p === '/guide') setActiveTab('guide');
        else if (p === '/downloads') setActiveTab('downloads');
        else setActiveTab('dashboard');
      }, 0);
    } else {
      setTimeout(() => {
        setShowLanding(false);
        const tab = p.split('/')[1] || p.substring(1);
        if (tab && tab !== '' && tab !== 'dashboard' && tab !== 'login' && tab !== 'register') {
          setActiveTab(tab);
        }
        // Handle special auth routes
        if (tab === 'register') {
          setAuthInitialTab('register-agency');
        } else if (tab === 'login') {
          setAuthInitialTab('login');
        }
      }, 0);
    }
    
    setTimeout(() => {
      if (pathname.startsWith('/en')) setLangState('en');
      else if (pathname.startsWith('/cz')) setLangState('cz');
    }, 0);
    
    // Save to localStorage for persistence
    localStorage.setItem('nexus_active_tab', p.split('/')[1] || p.substring(1) || 'dashboard');
  }, [pathname]);


  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => 
    localStorage.getItem('nexus_hasSeenOnboarding') === 'true' || 
    localStorage.getItem('nexus_onboarding_seen') === 'true'
  );
  const [showOnboarding, setShowOnboarding] = useState(() => 
    isNativeApp &&
    localStorage.getItem('nexus_hasSeenOnboarding') !== 'true' && 
    localStorage.getItem('nexus_onboarding_seen') !== 'true'
  );

  // --- 3. CORE IDENTITY & AUTH ---
  const [activeOperatorState, setActiveOperatorState] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem('nexus_active_profile_id') || 'all');

  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageValue, setMessageValue] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [_chatHistory, _setChatHistory] = useState([]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [_relaySimSlot, _setRelaySimSlot] = useState(() => localStorage.getItem('nexus_relay_sim_slot') || 'auto');
  const [_relayLogs, _setRelayLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_relay_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [_isRelayActive, setIsRelayActive] = useState(() => localStorage.getItem('nexus_relay_active') === 'true');
  const [isRelayMode, setIsRelayMode] = useState(() => localStorage.getItem('nexus_relay_active') === 'true');

  // Voice Guardian & Audio Sentinel
  const [voiceGuardianActive, setVoiceGuardianActive] = useState(false);
  const [audioSentinelActive, setAudioSentinelActive] = useState(false);
  const handleToggleVoiceGuardian = useCallback(async () => {
    // Dokud je Voice SOS uzamčené, neotvírej mikrofon — nesahali bychom na
    // něj kvůli ničemu (detekce neexistuje) a uživatelka by viděla indikátor
    // nahrávání u funkce, která nic nehlídá.
    if (isFeatureLockedNow('voice-sos')) return;
    const next = !voiceGuardianActive;
    setVoiceGuardianActive(next);
    if (next) {
      try {
        const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
        window._voiceGuardianStream = stream;
      } catch (_err) {
        console.warn('[VoiceGuardian] Mic permission denied', _err);
        setVoiceGuardianActive(false);
      }
    } else {
      if (window._voiceGuardianStream) {
        window._voiceGuardianStream.getTracks().forEach(t => t.stop());
        window._voiceGuardianStream = null;
      }
    }
  }, [voiceGuardianActive]);

  const [_sosActive, _setSosActive] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [checkinMinutes, setCheckinMinutes] = useState(30);
  const [checkinTimerEnd, setCheckinTimerEnd] = useState(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [hrThreshold, setHrThreshold] = useState(130);
  const [heartRate] = useState(0);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [incomingGhostCall, setIncomingGhostCall] = useState(false);
  const [ghostCallScheduledAt, setGhostCallScheduledAt] = useState(null);
  const [linkedSessionId, setLinkedSessionId] = useState(null);
  const [incomingRelayCall, setIncomingRelayCall] = useState(null);
  const [lastEmergencyAlert, setLastEmergencyAlert] = useState(null);
  const [lastRelayCommand, setLastRelayCommand] = useState(null);

  // UI Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);
  const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [agencyDetailModalData, setAgencyDetailModalData] = useState(null);
  const [_addUserModalAgencyId, _setAddUserModalAgencyId] = useState(null);
  const [_toasts, _setToasts] = useState([]);
  const [_mobileView, _setMobileView] = useState('list');
  const [_activeContextTab, _setActiveContextTab] = useState('history');
  const [_inlinePanelTab, _setInlinePanelTab] = useState('notes');
  const [calViewDate, setCalViewDate] = useState(new Date());

  const availableServers = useMemo(() => [
    { id: 'main-hub', name: 'Main Hub', ip: '78.141.202.139' },
    { id: 'ai-node', name: 'AI Node (Hetzner)', ip: '178.105.39.179' }
  ], []);
  const [selectedServerId, setSelectedServerId] = useState('main-hub');

  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);
  // Profily přihlášeného uživatele — v refu, protože socket handlery se registrují
  // dřív, než je myProfiles spočítané, a nesmí se kvůli nim přepojovat socket.
  const myProfilesRef = useRef([]);
  const ghostCallTimerRef = useRef(null);

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

  // Redirect unauthenticated users from protected routes to login
  useEffect(() => {
    if (!isLoggedIn) {
      const clean = pathname.replace(/^\/(en|cz)/, '') || '/';
      if (clean !== '/' && clean !== '/guide' && clean !== '/downloads' && clean !== '/login' && clean !== '/register' && clean !== '/logout') {
        setTimeout(() => navigate('/login', 'login'), 0);
      }
    }
  }, [isLoggedIn, pathname, navigate]);

  // Inicializovat push notifikace po přihlášení
  useEffect(() => {
    if (isLoggedIn && token && isNativeApp) {
      initPushNotifications(API_BASE, token, (notification, isAction) => {
        console.log('[NexusContext] Push Notification:', notification, 'isAction:', isAction);
        // Můžeme sem případně přidat logika na otevření chatu (isAction = kliknutí na notifikaci)
      });
    }
  }, [isLoggedIn, token, isNativeApp]);

  const memoizedSetActiveOperator = useCallback((op) => setActiveOperatorState(op), []);
  const memoizedSetMessages = useCallback((msgs) => setMessages(msgs), []);
  const memoizedNormalizeProfileId = useCallback((id) => id, []);
  const memoizedNoop = useCallback(() => {}, []);

  const nexusData = useNexusData({
    token, isLoggedIn, API_BASE, activeProfileId,
    activeMarket,
    setActiveOperator: memoizedSetActiveOperator,
    normalizeProfileId: memoizedNormalizeProfileId,
    setMessages: memoizedSetMessages,
    setActiveSafetySession: memoizedNoop,
    setIsTimerActive: memoizedNoop,
    setTimeLeft: memoizedNoop,
    showToast, lang
  });

  const activeOperator = useMemo(() => {
    const raw = activeOperatorState || authUser;
    if (!raw) return null;
    const role = String(raw.role || '').toUpperCase().replace(/\s+/g, '_');
    return {
      ...raw,
      isAppOwner: role === 'APP_OWNER',
      isAdmin: role === 'ADMIN' || role === 'AGENCY_ADMIN',
      isManager: role === 'MANAGER',
      isSeniorOperator: role === 'SENIOR_OPERATOR' || role === 'SENIOR_OPERÁTOR',
      isOperator: role === 'OPERATOR',
      isModel: role === 'MODEL'
    };
  }, [activeOperatorState, authUser]);

  // --- 4. CHAT & MESSAGING LOGIC ---
  const chatLogic = useChatLogic({
    token,
    API_BASE,
    activeOperator,
    activeProfileId,
    _showToast: showToast,
    t,
    addNotification: (n) => showToast(n.message, n.type === '_err' ? 'error' : 'info'),
    _playNotificationSound: () => {},
    profiles: nexusData.profiles,
    messages,
    setMessages,
    selectedChatId,
    setSelectedChatId,
    isHistoryLoading,
    setIsHistoryLoading
  });

  const { 
    chatMessages, fetchChatMessages, handleSendMessage,
    handleSaveNote, handleDeleteNote, handleTranslate, clientNotes, internalNote, setInternalNote,
    filteredMessages, setActiveContactId, selectedChat, typingProfiles, handleRefreshMessages
  } = chatLogic;

  const handleIncomingRelayCall = useCallback((data = {}) => {
    const caller = data.from || data.caller || data.callerId || data.phone || (lang === 'cz' ? 'Neznámé číslo' : 'Unknown caller');
    const profileName = data.profileName || data.profile?.name || data.name || '';
    setIncomingRelayCall({
      ...data,
      caller,
      profileName,
      receivedAt: Date.now()
    });
    showToast(
      lang === 'cz'
        ? `Příchozí hovor${profileName ? ` pro ${profileName}` : ''}: ${caller}`
        : `Incoming call${profileName ? ` for ${profileName}` : ''}: ${caller}`,
      'info'
    );
  }, [lang, showToast]);

  const handleEmergencySocketAlert = useCallback((data = {}) => {
    setLastEmergencyAlert({ ...data, receivedAt: Date.now() });
    _setSosActive(true);
    const profileName = data.profileName || data.profile?.name || data.profileId || '';
    showToast(
      lang === 'cz'
        ? `SOS alert${profileName ? `: ${profileName}` : ''}`
        : `SOS alert${profileName ? `: ${profileName}` : ''}`,
      'error'
    );
  }, [lang, showToast]);

  const handleRelayCommandSocket = useCallback((data = {}) => {
    setLastRelayCommand({ ...data, receivedAt: Date.now() });
    if (['SYNC_WEB_PROFILE', 'BOOST_PROFILE'].includes(data.type)) {
      showToast(
        lang === 'cz' ? 'Relay příkaz byl odeslán do zařízení.' : 'Relay command was sent to the device.',
        'info'
      );
    }
  }, [lang, showToast]);

  // --- Socket.io Integration ---
  const socket = useSocket(
    token,
    (d) => {
      const message = d?.message || d;
      if (message) chatLogic.upsertIncomingMessage(message);
    },
    (d) => {
      const message = d?.message || d;
      if (!message) return;
      setMessages(p => p.map(m => {
        const sameMessage = m.id === message.id;
        const sameChat = message.chatId && (m.id === message.chatId || m.chatId === message.chatId);
        return sameMessage || sameChat ? { ...m, ...message, id: m.id, chatId: m.chatId || message.chatId } : m;
      }));
    },
    handleIncomingRelayCall,
    handleEmergencySocketAlert,
    handleIncomingRelayCall,
    handleRelayCommandSocket,
    (d) => d?.type === 'SYNC_COMPLETED' && showToast(lang === 'cz' ? '✅ Synchronizace dokončena' : '✅ Sync completed', 'success'),
    (d) => nexusData.applyTrackerLocation?.(d),
    // Fantomový hovor od operátora. Event chodí do celé agentury, takže si ho
    // vezme jen zařízení té modelky, které se týká — operátoři ho ignorují.
    (d) => {
      const targetId = d?.profileId;
      if (!targetId) return;
      const mine = (myProfilesRef.current || []).some(p => String(p.id) === String(targetId));
      if (!mine) return;
      setGhostCallScheduledAt(null);   // vzdálený hovor zvoní hned, žádný odpočet
      setIncomingGhostCall(true);
    }
  );

  // --- Capacitor Connection Recovery ---
  useEffect(() => {
    if (isNativeApp && Capacitor.isPluginAvailable('App')) {
      const listener = CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log('[NexusContext] App resumed. Reconnecting socket and fetching messages.');
          const activeSocket = getSocket();
          if (activeSocket) {
            activeSocket.disconnect();
            setTimeout(() => {
              const s = getSocket();
              if (s) s.connect();
            }, 500);
          }
          if (selectedChatId) {
            fetchChatMessages(selectedChatId);
          }
        }
      });
      return () => {
        listener.then(l => l.remove());
      };
    }
  }, [isNativeApp, selectedChatId, fetchChatMessages]);

  // --- 5. PERMISSIONS & PROFILES ---
  const { isAllowed, activeRole: normalizedRole } = usePermissions(activeOperator, activeOperator?.permissions);

  const activeProfile = useMemo(() => {
    if (!activeProfileId || activeProfileId === 'all') return null;
    return (nexusData.profiles || []).find(p => String(p.id) === String(activeProfileId));
  }, [activeProfileId, nexusData.profiles]);

  const linkedTracker = useMemo(() => {
    const activeTrackers = (nexusData.trackers || []).filter(t => t.active !== false);
    if (!activeTrackers.length) return null;
    if (activeProfileId && activeProfileId !== 'all') {
      return activeTrackers.find(t => String(t.profileId || '') === String(activeProfileId)) || activeTrackers[0];
    }
    return activeTrackers[0];
  }, [nexusData.trackers, activeProfileId]);

  const gpsHistory = useMemo(() => nexusData.gpsHistory || [], [nexusData.gpsHistory]);
  const lastTrackerUpdate = useMemo(() => {
    const value = linkedTracker?.lastSeenAt || linkedTracker?.lastCapturedAt;
    if (!value) return null;
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? null : ts;
  }, [linkedTracker]);

  useEffect(() => {
    if (!checkinTimerEnd) return undefined;
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [checkinTimerEnd]);

  const checkinTimerEndTs = checkinTimerEnd ? new Date(checkinTimerEnd).getTime() : null;
  const checkinRemaining = checkinTimerEndTs ? Math.max(0, checkinTimerEndTs - nowTs) : 0;

  const startCheckinTimer = useCallback(() => {
    const endAt = new Date(Date.now() + Number(checkinMinutes || 30) * 60000);
    setCheckinTimerEnd(endAt.toISOString());
  }, [checkinMinutes]);

  const resetCheckinTimer = useCallback(() => {
    setCheckinTimerEnd(null);
    setLinkedSessionId(null);
  }, []);

  const triggerSOS = useCallback(async (type = 'manual') => {
    _setSosActive(true);
    try {
      await fetch(`${API_BASE}/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type,
          profileId: activeProfileId && activeProfileId !== 'all' ? activeProfileId : null,
          lat: linkedTracker?.lastLat ?? null,
          lng: linkedTracker?.lastLng ?? null,
          accuracy: linkedTracker?.lastAccuracy ?? null
        })
      });
    } catch (_err) {
      console.warn('[Safety] SOS trigger failed:', _err);
    }
  }, [token, activeProfileId, linkedTracker]);

  const cancelSOS = useCallback(() => {
    _setSosActive(false);
  }, []);

  // ── Telefon jako GPS tracker (Model, native) — gating A+B+C ──────────────────
  // Reportuj polohu na /ingest, když platí KTERÉKOLIV z: manuální přepínač (B) /
  // aktivní check-in schůzky (A) / aktivní SOS (C). Jinak mlč (baterie + soukromí).
  const [manualTrackingOn, setManualTrackingOnState] = useState(() => {
    try { return localStorage.getItem('nexus_manual_tracking') === '1'; } catch { return false; }
  });
  const setManualTracking = useCallback((on) => {
    setManualTrackingOnState(!!on);
    try { localStorage.setItem('nexus_manual_tracking', on ? '1' : '0'); } catch { /* ignore */ }
  }, []);

  const phoneTrackingActive =
    manualTrackingOn || _sosActive || (!!checkinTimerEnd && checkinRemaining > 0);

  // Reaktivní stav zámku — když ho App Owner přepne, efekt níž se přehodnotí.
  const phoneTrackingLocked = useFeatureLock('phone-tracking');

  useEffect(() => {
    const roleUpper = String(activeOperator?.role?.name || activeOperator?.role || '')
      .toUpperCase().replace(/\s+/g, '_');
    if (!isNativeApp || roleUpper !== 'MODEL' || !token) return;

    // Bezpečnostní pojistka: dokud je funkce uzamčená (neověřená na zařízení),
    // NEspouštěj reálné sledování — ani při check-inu/SOS. Ať nikdo nespoléhá na
    // něco, co ještě nemusí fungovat.
    if (phoneTrackingLocked) { stopPhoneTracking().catch(() => {}); return; }

    if (phoneTrackingActive) {
      // Bez installationId by sledování tiše neběželo — u bezpečnostní funkce
      // nepřípustné. Když ID chybí, vygenerujeme a uložíme ho (stabilní pseudo-IMEI).
      const installationId = getOrCreateInstallationId();
      if (installationId) ensurePhoneTracking(API_BASE, token, installationId).catch(() => {});
    } else {
      stopPhoneTracking().catch(() => {});
    }
  }, [phoneTrackingActive, phoneTrackingLocked, isNativeApp, token, activeOperator]);

  // App Owner vidí zamčené funkce odemčené (může je otestovat). Ostatní role ne.
  useEffect(() => {
    setAppOwnerBypass(!!activeOperator?.isAppOwner);
  }, [activeOperator?.isAppOwner]);

  // Při odmountování (logout / teardown) zastav sledování.
  useEffect(() => () => { stopPhoneTracking().catch(() => {}); }, []);

  const confirmDeparture = useCallback(() => {
    resetCheckinTimer();
  }, [resetCheckinTimer]);

  // Naplánovaný fantomový hovor. Dřív se zpoždění ignorovalo (hovor zazvonil hned)
  // a `ghostCallScheduledAt` se po odzvonění ani odmítnutí nevynulovalo, takže
  // v UI zůstal viset odpočet, který šel do záporu („Vyzvánění začne za −52s").
  const triggerGhostCall = useCallback((delay = 0) => {
    const ms = Math.max(0, Number(delay || 0) * 1000);
    if (ghostCallTimerRef.current) clearTimeout(ghostCallTimerRef.current);

    const fire = () => {
      ghostCallTimerRef.current = null;
      setGhostCallScheduledAt(null);   // odpočet skončil, ať nepokračuje do minusu
      setIncomingGhostCall(true);
    };

    if (ms === 0) {
      setGhostCallScheduledAt(null);
      fire();
      return;
    }
    setGhostCallScheduledAt(Date.now() + ms);
    ghostCallTimerRef.current = setTimeout(fire, ms);
  }, []);

  // Zrušení naplánovaného hovoru při odchodu z appky (jinak by zazvonil "z ničeho nic").
  useEffect(() => () => {
    if (ghostCallTimerRef.current) clearTimeout(ghostCallTimerRef.current);
  }, []);

  const verifyIdentity = useCallback(async () => true, []);
  const playBeep = useCallback(() => {}, []);

  const myProfiles = useMemo(() => {
    const all = nexusData.profiles || [];
    if (!activeOperator) return [];
    
    // Admins, App Owners, Managers and Senior Operators usually see all profiles in this agency setup
    if (activeOperator.isAppOwner || activeOperator.isAdmin || activeOperator.isManager || activeOperator.isSeniorOperator) {
      return all;
    }
    
    // Explicit role string check as safety fallback
    const role = String(activeOperator.role || '').toUpperCase().replace(/\s+/g, '_');
    if (['ADMIN', 'AGENCY_ADMIN', 'APP_OWNER', 'MANAGER', 'SENIOR_OPERATOR', 'SENIOR_OPERÁTOR'].includes(role)) {
      return all;
    }
    
    // For regular operators, filter by assigned profiles using multiple possible field names
    return all.filter(p => {
      const opId = activeOperator.id || activeOperator._id;
      return (
        p.operatorIds?.includes(opId) || 
        p.assignedOperatorIds?.includes(opId) ||
        p.assignees?.includes(opId) ||
        (Array.isArray(p.operators) && p.operators.some(o => (o.id || o._id || o) === opId))
      );
    });
  }, [nexusData.profiles, activeOperator]);

  useEffect(() => { myProfilesRef.current = myProfiles; }, [myProfiles]);

  const navigateStable = useCallback((path, tab) => navigate(path, tab), [navigate]);

  const daysLeft = useMemo(() => {
    const activeSub = nexusData?.activeSubscription;
    if (!activeSub) return 0;
    const now = new Date();
    const expiresAt = new Date(activeSub.expiresAt);
    return Math.max(0, Math.ceil((expiresAt - now) / 86400000));
  }, [nexusData]);

  const value = useMemo(() => ({
    socket,
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket,
    pathname, navigate: navigateStable, authInitialTab, setAuthInitialTab,
    loading: nexusData.isDataLoading, activeOperator, isLoggedIn, token,
    logout, onLogin: handleLogin, onRegisterAgency: auth.handleRegisterAgency, onRegisterUser: auth.handleRegisterUser,
    API_BASE, showLanding, setShowLanding, hasSeenOnboarding, setHasSeenOnboarding, showOnboarding, setShowOnboarding,
    isMobile, isNativeApp, isSidebarOpen, setIsSidebarOpen,
    isSidebarCollapsed, setIsSidebarCollapsed,
    messages, selectedChatId, setSelectedChatId, messageValue, setMessageValue,
    isEditProfileOpen, setIsEditProfileOpen, isAddAgencyOpen, setIsAddAgencyOpen,
    isAddUserOpen, setIsAddUserOpen, isBugReportOpen, setIsBugReportOpen,
    editingProfileData, setEditingProfileData,
    handleEditProfile: (profile) => { setEditingProfileData(profile); setIsEditProfileOpen(true); },
    agencyDetailModalData, setAgencyDetailModalData,
    calViewDate, setCalViewDate, showPanicConfirm, setShowPanicConfirm,
    chatScrollRef, isUserScrolled, showToast, _toasts, toasts: _toasts, setToasts: _setToasts,
    availableServers, selectedServerId, setSelectedServerId,
    isAllowed, activeRole: normalizedRole,
    isAppOwner: activeOperator?.isAppOwner,
    // Zámky nedodělaných funkcí (admin UI v GlobalFeaturesView)
    featureLocks: nexusData.featureLocks,
    handleFeatureLockToggle: nexusData.handleFeatureLockToggle,
    lockableFeatures: nexusData.lockableFeatures,
    activeProfile, activeProfileId, setActiveProfileId, 
    myProfiles, profiles: nexusData.profiles, _profiles: nexusData.profiles,
    operators: nexusData.operators,
    agencies: nexusData.agencies,
    sessions: nexusData.sessions,
    handleRevokeBinding: nexusData.handleRevokeBinding,
    onlineOnly, setOnlineOnly,
    totalUnread: messages.filter(m => m.status === 'unread').length,
    activeSubscription: nexusData.activeSubscription,
    subscriptionHistory: nexusData.subscriptionHistory,
    subscriptionPlans: nexusData.subscriptionPlans,
    fetchPlans: nexusData.fetchPlans,
    updatePlans: nexusData.updatePlans,
    isPlansLoading: nexusData.isPlansLoading,
    isStartingSubscription: nexusData.isStartingSubscription,
    onStartSubscription: nexusData.onStartSubscription,
    onCancelSubscription: nexusData.onCancelSubscription,
    startCheckout: nexusData.startCheckout,
    startBillingPortal: nexusData.startBillingPortal,
    daysLeft,
    // Safety - Voice Guardian & Audio Sentinel
    voiceGuardianActive, handleToggleVoiceGuardian,
    audioSentinelActive, setAudioSentinelActive,
    sosActive: _sosActive, triggerSOS, cancelSOS,
    manualTrackingOn, setManualTracking, phoneTrackingActive,
    linkedSessionId, checkinMinutes, setCheckinMinutes,
    checkinTimerEnd, checkinRemaining, startCheckinTimer, resetCheckinTimer, confirmDeparture,
    SAFETY_SUGGESTIONS: ['15m', '30m', '45m', '60m', '1.5h', '2h'],
    onDelayBooking: nexusData.handleDelayBooking,
    trackers: nexusData.trackers || [],
    linkedTracker, linkedTrackerId: linkedTracker?.imei || linkedTracker?.id || null,
    lastTrackerUpdate, trackerProvisioning: nexusData.trackerProvisioning,
    isPairingTracker: nexusData.isPairingTracker,
    handlePairTracker: nexusData.handlePairTracker,
    handleUnpairTracker: nexusData.handleUnpairTracker,
    gpsHistory, _gpsHistory: gpsHistory,
    batteryLevel: linkedTracker?.lastBattery ?? 100,
    incomingGhostCall, setIncomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity,
    heartRate, hrThreshold, setHrThreshold, isBluetoothConnected, setIsBluetoothConnected,
    incomingRelayCall, setIncomingRelayCall, lastEmergencyAlert, lastRelayCommand,
    activeBioWarning: false,
    playBeep,
    // Relay mode
    isRelayMode, setIsRelayMode,
    // Chat Logic
    chatMessages, isHistoryLoading, fetchChatMessages, handleSendMessage,
    handleSaveNote, handleDeleteNote, handleTranslate, clientNotes, internalNote, setInternalNote,
    filteredMessages, setActiveContactId, selectedChat, typingProfiles, handleRefreshMessages,
    handleSyncChatHistory: nexusData.handleSyncChatHistory
  }), [
    t, lang, setLang, activeTab, setActiveTab, activeMarket, setActiveMarket, pathname, navigateStable, authInitialTab,
    nexusData.isDataLoading, activeOperator, isLoggedIn, token, logout, handleLogin,
    auth.handleRegisterAgency, auth.handleRegisterUser, showToast,
    showLanding, hasSeenOnboarding, showOnboarding, isMobile, isNativeApp, isSidebarOpen, isSidebarCollapsed,
    messages, selectedChatId, messageValue, isEditProfileOpen, isAddAgencyOpen,
    isAddUserOpen, isBugReportOpen, agencyDetailModalData, editingProfileData, calViewDate, showPanicConfirm, _toasts,
    availableServers, selectedServerId, setSelectedServerId,
    isAllowed, normalizedRole, activeProfile, activeProfileId, myProfiles, nexusData.profiles,
    nexusData.featureLocks, nexusData.handleFeatureLockToggle, nexusData.lockableFeatures,
    nexusData.operators, nexusData.agencies, nexusData.sessions, nexusData.handleRevokeBinding, onlineOnly,
    nexusData.activeSubscription, nexusData.subscriptionHistory, nexusData.subscriptionPlans, nexusData.fetchPlans,
    nexusData.updatePlans, nexusData.isPlansLoading, nexusData.isStartingSubscription, nexusData.onStartSubscription,
    nexusData.onCancelSubscription, nexusData.startCheckout, nexusData.startBillingPortal, daysLeft,
    voiceGuardianActive, handleToggleVoiceGuardian, audioSentinelActive, _sosActive, triggerSOS, cancelSOS,
    manualTrackingOn, setManualTracking, phoneTrackingActive,
    linkedSessionId, checkinMinutes, checkinTimerEnd, checkinRemaining, startCheckinTimer, resetCheckinTimer, confirmDeparture,
    nexusData.handleDelayBooking, nexusData.trackers, linkedTracker, lastTrackerUpdate, nexusData.trackerProvisioning,
    nexusData.isPairingTracker, nexusData.handlePairTracker, nexusData.handleUnpairTracker, gpsHistory,
    incomingGhostCall, ghostCallScheduledAt, triggerGhostCall, verifyIdentity, heartRate, hrThreshold, isBluetoothConnected,
    incomingRelayCall, lastEmergencyAlert, lastRelayCommand, playBeep,
    isRelayMode,
    // Chat Logic Deps
    chatMessages, isHistoryLoading, fetchChatMessages, handleSendMessage,
    handleSaveNote, handleDeleteNote, handleTranslate, clientNotes, internalNote, setInternalNote,
    filteredMessages, setActiveContactId, selectedChat, typingProfiles, handleRefreshMessages,
    nexusData.handleSyncChatHistory,
    socket
  ]);

  return (
    <NexusContext.Provider value={value}>
      {children}
    </NexusContext.Provider>
  );
};
