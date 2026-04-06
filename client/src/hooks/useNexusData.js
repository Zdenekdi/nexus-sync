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
  const [_globalFeatures, _setGlobalFeatures] = useState([]);
  const [_auditLogs, _setAuditLogs] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [clientNames, _setClientNames] = useState(() => {
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
      const [safetyRes, profileRes, chatRes, userRes, bindingRes, statsRes, agencyRes, selfRes] = await Promise.all([
        axiosWithTiming(`${API_BASE}/safety/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/chats`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/device/bindings`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axiosWithTiming(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
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

      if (selfRes && selfRes.data) {
        setActiveOperator(selfRes.data);
        localStorage.setItem('nexus_activeOperator', JSON.stringify(selfRes.data));
      }

      // NO DEMO FALLBACKS - Use server data or initial empty state
      if (statsRes?.data) {
        const s = statsRes.data;
        setStats({
          revenueMtd: s.revenue || '£0.00',
          revenueChange: 0,
          activeBookings: s.totalBookings || 0,
          bookingsChange: 0,
          totalMessages: s.totalMessages || 0,
          messagesChange: 0,
          conversionRate: s.conversionRate || 0,
          conversionChange: 0,
          revenueData: s.chartData || [],
          profilePerf: [],
          operatorPerf: [],
          totalAgencies: s.totalAgencies || 0,
          totalProfiles: s.totalProfiles || 0,
          uptime: s.uptime || '100% UP'
        });
      }

      if (profileRes?.data) {
        setProfiles(Array.isArray(profileRes.data) ? profileRes.data : []);
      }

      if (safetyRes?.data) {
        setActiveSafetySession(safetyRes.data);
        setIsTimerActive(true);
        const endAt = new Date(safetyRes.data.plannedEndAt).getTime();
        setTimeLeft(Math.floor((endAt - Date.now()) / 1000));
      }

      if (chatRes?.data) {
        const mappedMessages = (chatRes.data || []).map(chat => ({
          id: chat.id,
          chatId: chat.id,
          profileId: normalizeProfileId(chat.profileId),
          from: chat.externalId,
          text: (chat.messages?.[0]?.text || 'No messages'),
          timestamp: chat.lastMessageAt || new Date().toISOString(),
          status: 'read',
          direction: 'inbound',
          transport: 'sms'
        }));
        setMessages(mappedMessages);
      }

      if (userRes?.data) setOperators(Array.isArray(userRes.data) ? userRes.data : []);
      if (bindingRes?.data?.ok) {
        setSessions(bindingRes.data.bindings.map(b => ({
          id: b.id, device: b.model || 'Android', status: b.active ? 'Active' : 'Disabled'
        })));
      }
      if (agencyData) setAgencies(Array.isArray(agencyData) ? agencyData : [agencyData]);

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
    subscriptionHistory: _subscriptionHistory, globalFeatures: _globalFeatures, auditLogs: _auditLogs, isDataLoading, clientNames,
    bookingSchedule: _bookingSchedule, isCalendarSyncOpen, setIsCalendarSyncOpen, calendarSyncUrl, setCalendarSyncUrl,
    isBookingModalOpen, setIsBookingModalOpen, selectedScheduleEvent, setSelectedScheduleEvent,
    newBookingForm, setNewBookingForm, bioText, setBioText, isSyncing, syncStatus: _syncStatus, syncProgress: _syncProgress,
    handleSaveBio, handleSyncAll, handleQuickSaveMeeting, initData
  };
}
