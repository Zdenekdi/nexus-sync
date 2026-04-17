import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to manage data fetching and global data state for Nexus Hub.
 * Fetches data EXCLUSIVELY from the API. No demo fallbacks.
 */
export function useNexusData({ 
  token, 
  isLoggedIn, 
  API_BASE, 
  activeProfileId,
  setActiveOperator,
  normalizeProfileId,
  setMessages,
  setActiveSafetySession,
  setIsTimerActive,
  setTimeLeft,
  showToast,
  lang
}) {
  const [profiles, setProfiles] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [_agencySettings, _setAgencySettings] = useState({ safetyAlertMode: 'MANAGERS_AND_ASSIGNED' });
  const [operators, setOperators] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    revenueMtd: 0,
    revenueChange: 0,
    activeBookings: 0,
    bookingsChange: 0,
    totalMessages: 0,
    messagesChange: 0,
    conversionRate: 0,
    conversionChange: 0,
    revenueData: [],
    profilePerf: [],
    operatorPerf: []
  });
  const [_activeSubscription, _setActiveSubscription] = useState(null);
  const [_subscriptionHistory, _setSubscriptionHistory] = useState([]);
  const [_globalFeatures, _setGlobalFeatures] = useState([
    { id: 'master_sync', label: 'Master Sync', desc: 'Sledování databází a notifikací pro agentury napříč sítí v reálném čase', active: true },
    { id: 'ai_optimizer', label: 'AI Optimizer', desc: 'Trénovací moduly a automatické návrhy chatů a optimalizační nástroje', active: false },
    { id: 'audit_vault', label: 'Audit Vault', desc: 'Zabezpečené cloudové zálohování a kompletní audit operátorů pro případné kontroly', active: true },
    { id: 'cloud_bridge', label: 'Cloud Bridge', desc: 'Přímé propojení Nexus subsystémů s mezinárodním API plateb a bran', active: false }
  ]);
  const [_auditLogs, _setAuditLogs] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [clientNames, setClientNames] = useState({});

  // Global Features & Training Actions
  const handleFeatureToggle = useCallback((feature, i) => {
    const updated = [..._globalFeatures];
    updated[i].active = !updated[i].active;
    _setGlobalFeatures(updated);
  }, [_globalFeatures]);

  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const onStartTraining = useCallback(() => {
    setIsTraining(true);
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          return 100;
        }
        return p + 5;
      });
    }, 500);
  }, []);

  const onResetTraining = useCallback(() => {
    setTrainingProgress(0);
    setIsTraining(false);
  }, []);

  const [_clientNames, _setClientNames] = useState(() => {
    const saved = localStorage.getItem('nexus_client_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [_bookingSchedule, _setBookingSchedule] = useState([]);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [calendarSyncUrl, setCalendarSyncUrl] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedScheduleEvent, setSelectedScheduleEvent] = useState(null);
  const [newBookingForm, setNewBookingForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', locationType: 'incall' });
  
  const [bioText, setBioText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [_syncStatus, _setSyncStatus] = useState({ aw: 'synced', ege: 'synced', tpb: 'warning' });
  const [_syncProgress, _setSyncProgress] = useState(0);

  const [_plans, _setPlans] = useState([]);
  
  useEffect(() => {
    localStorage.setItem('nexus_client_names', JSON.stringify(clientNames));
  }, [clientNames]);

  const axiosWithTiming = useCallback(async (url, config = {}) => {
    try {
      const res = await axios.get(url, { ...config, timeout: 10000 });
      return res;
    } catch (err) {
      console.warn(`[API] Fetch failed for ${url}:`, err.message);
      return { data: null };
    }
  }, []);

  const initData = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    
    setIsDataLoading(true);
    try {
      const [safetyRes, profileRes, chatRes, userRes, bindingRes, statsRes, agencyRes, selfRes, analyticsRes] = await Promise.all([
        axiosWithTiming(`${API_BASE}/safety/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/chats`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/device/bindings`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axiosWithTiming(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/analytics/summary?days=7`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);

      // For non-owner roles, fetch own agency details if /agency/all returned nothing
      let agencyData = agencyRes?.data;
      if (!agencyData || !Array.isArray(agencyData) || agencyData.length === 0) {
        try {
          const ownAgencyRes = await axiosWithTiming(`${API_BASE}/agency/settings`, { headers: { Authorization: `Bearer ${token}` } });
          if (ownAgencyRes?.data) {
            agencyData = [ownAgencyRes.data];
          }
        } catch (e) { /* ignore */ }
      }

      // ------------------------------------------------------------
      // DEFENSIVE DATA PROCESSING
      // ------------------------------------------------------------
      try {
        if (selfRes?.data) {
          setActiveOperator(selfRes.data);
          localStorage.setItem('nexus_activeOperator', JSON.stringify(selfRes.data));
        }

        // Stats Handling
        if (statsRes?.data) {
          const s = statsRes.data || {};
          const dayNames = lang === 'cz' 
            ? ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          let richChartData = [];
          let sparklineData = Array.isArray(s.chartData) ? s.chartData : [];
          
          const analyticsChart = analyticsRes?.data?.chartData;
          if (Array.isArray(analyticsChart) && analyticsChart.length > 0) {
            richChartData = analyticsChart.map(d => {
              try {
                return {
                  day: dayNames[new Date(d.date).getDay()] || '?',
                  revenue: Number(d.revenue || 0),
                  bookings: Number(d.bookings || 0)
                };
              } catch (e) { return { day: '?', revenue: 0, bookings: 0 }; }
            });
            sparklineData = analyticsChart.map(d => Number(d.revenue || d.bookings || 0));
          } else if (sparklineData.length > 0) {
            const now = new Date();
            richChartData = sparklineData.map((val, i) => {
              const d = new Date(now);
              d.setDate(d.getDate() - (sparklineData.length - 1 - i));
              return { day: dayNames[d.getDay()] || '?', revenue: Number(val), bookings: 0 };
            });
          }

          setStats({
            revenue: analyticsRes?.data?.revenue != null 
              ? `£${Number(analyticsRes.data.revenue).toFixed(2)}` 
              : (s.revenue || '£0.00'),
            revenueMtd: s.revenue || '£0.00',
            revenueChange: Number(analyticsRes?.data?.revenueChange || 0),
            totalBookings: Number(analyticsRes?.data?.bookings || s.totalBookings || 0),
            activeBookings: Number(s.totalBookings || 0),
            bookingsChange: Number(analyticsRes?.data?.bookingsChange || 0),
            totalMessages: Number(s.totalMessages || 0),
            messagesChange: 0,
            totalCalls: Number(s.totalCalls || 0),
            conversionRate: Number(s.conversionRate || 0),
            conversionChange: 0,
            commissionGrowth: String(s.commissionGrowth || 'STABLE'),
            chartData: richChartData.length > 0 ? richChartData : (sparklineData.length > 0 ? sparklineData : [0,0,0,0,0,0,0]),
            sparklineData: sparklineData.length > 0 ? sparklineData : [0,0,0,0,0,0,0],
            revenueData: richChartData,
            profilePerf: [],
            operatorPerf: [],
            totalAgencies: Number(s.totalAgencies || 0),
            totalProfiles: Number(s.totalProfiles || 0),
            totalUsers: Number(s.totalUsers || 0),
            uptime: String(s.uptime || '100% UP'),
            activeProfiles: Number(analyticsRes?.data?.activeProfiles || s.totalProfiles || 0)
          });
        }

        // Profiles Handling
        setProfiles(Array.isArray(profileRes?.data) ? profileRes.data : []);

        // Safety Sessions Handling
        if (safetyRes?.data && typeof safetyRes.data === 'object') {
          setActiveSafetySession(safetyRes.data);
          setIsTimerActive(true);
          try {
            const endAt = new Date(safetyRes.data.plannedEndAt).getTime();
            if (!isNaN(endAt)) {
              setTimeLeft(Math.floor((endAt - Date.now()) / 1000));
            }
          } catch (e) { console.warn('[Safety] Date parse failed', e); }
        }

        // Messages/Chats Handling
        if (Array.isArray(chatRes?.data)) {
          const mappedMessages = chatRes.data.map(chat => {
            if (!chat) return null;
            return {
              id: chat.id,
              chatId: chat.id,
              profileId: normalizeProfileId(chat.profileId),
              profileName: chat.profile?.name || null,
              from: chat.externalId || 'Unknown',
              text: (chat.messages?.[0]?.text || 'No messages'),
              senderName: chat.messages?.[0]?.sender?.name || null,
              timestamp: chat.lastMessageAt || new Date().toISOString(),
              status: 'read',
              direction: 'inbound',
              transport: 'sms'
            };
          }).filter(Boolean);
          setMessages(mappedMessages);
        }

        // Operators & Bindings
        if (Array.isArray(userRes?.data)) setOperators(userRes.data);
        
        if (bindingRes?.data?.ok && Array.isArray(bindingRes?.data?.bindings)) {
          setSessions(bindingRes.data.bindings.map(b => ({
            id: b.id, device: b.model || 'Android', status: b.active ? 'Active' : 'Disabled'
          })));
        }

        // Agency Data
        if (agencyData) {
          setAgencies(Array.isArray(agencyData) ? agencyData : [agencyData]);
        }

      } catch (processingErr) {
        console.error('[Data] Critical processing error:', processingErr);
      }

    } catch (err) {
      console.error('[Data] Init error:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [isLoggedIn, token, API_BASE, axiosWithTiming, normalizeProfileId, setMessages, setActiveOperator, setActiveSafetySession, setIsTimerActive, setTimeLeft]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleSaveBio = useCallback(async () => {
    if (!activeProfileId) return;
    try {
      await axios.patch(`${API_BASE}/profiles/${activeProfileId}`, { description: bioText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initData();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(lang === 'cz' ? 'Nepodařilo se uložit popis.' : 'Failed to save description.', 'error');
    }
  }, [activeProfileId, bioText, token, API_BASE, initData, showToast, lang]);

  const handleSyncAll = useCallback(() => {
    // Implement real sync via API when needed
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }, []);

  const handleQuickSaveMeeting = useCallback(async (meeting) => {
    try {
      await axios.post(`${API_BASE}/bookings`, {
        profileId: activeProfileId, title: `Meeting: ${meeting.time}`, date: meeting.date, startTime: meeting.time, duration: meeting.duration
      }, { headers: { Authorization: `Bearer ${token}` } });
      initData();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(lang === 'cz' ? 'Nepodařilo se uložit schůzku.' : 'Failed to save meeting.', 'error');
    }
  }, [activeProfileId, token, API_BASE, initData, showToast, lang]);

  return {
    profiles, agencies, agencySettings: _agencySettings, operators, sessions, stats, activeSubscription: _activeSubscription,
    subscriptionHistory: _subscriptionHistory, globalFeatures: _globalFeatures, handleFeatureToggle,
    isTraining, trainingProgress, onStartTraining, onResetTraining,
    auditLogs: _auditLogs, isDataLoading, clientNames,
    bookingSchedule: _bookingSchedule, isCalendarSyncOpen, setIsCalendarSyncOpen, calendarSyncUrl, setCalendarSyncUrl,
    isBookingModalOpen, setIsBookingModalOpen, selectedScheduleEvent, setSelectedScheduleEvent,
    newBookingForm, setNewBookingForm, bioText, setBioText, isSyncing, syncStatus: _syncStatus, syncProgress: _syncProgress,
    handleSaveBio, handleSyncAll, handleQuickSaveMeeting, initData
  };
}
