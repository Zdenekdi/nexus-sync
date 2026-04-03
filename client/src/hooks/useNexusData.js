import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to manage data fetching and global data state for Nexus Hub.
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
  setTimeLeft
}) {
  const [profiles, setProfiles] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [agencySettings, setAgencySettings] = useState({ safetyAlertMode: 'MANAGERS_AND_ASSIGNED' });
  const [operators, setOperators] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [globalFeatures, setGlobalFeatures] = useState([
    { id: 'ai_trans', label: 'AI Voice Relay (Beta)', desc: 'Enable neural speech-to-speech routing', active: true },
    { id: 'vc_hub', label: 'Cross-Agency Analytics', desc: 'Enable view of aggregated data', active: true },
    { id: 'CRM_adv', label: 'Proxy Pooling', desc: 'Allow sharing device nodes', active: true },
    { id: 'stats_bi', label: 'Payout Processing', desc: 'Automate weekly commission transfers', active: false }
  ]);
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, timestamp: '14:22:15', action: 'Login Success', operator: 'Alice (Agency Admin)', profile: 'N/A', hash: '0x8f2d...4a1b' },
    { id: 2, timestamp: '14:25:32', action: 'Message Sent', operator: 'Alice (Agency Admin)', profile: 'Diana (London)', hash: '0x4e9a...9c2d' },
    { id: 3, timestamp: '14:30:05', action: 'Status Changed', operator: 'Bob (Night Shift)', profile: 'N/A', hash: '0x3b1c...2f5e' }
  ]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Business UI States (Moved from App.jsx)
  const [clientNames, setClientNames] = useState(() => {
    const saved = localStorage.getItem('nexus_client_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [bookingSchedule, setBookingSchedule] = useState([]);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [calendarSyncUrl, setCalendarSyncUrl] = useState('');
  const [openBookingMenuId, setOpenBookingMenuId] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedScheduleEvent, setSelectedScheduleEvent] = useState(null);
  const [newBookingForm, setNewBookingForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', locationType: 'incall' });
  const [relayApkInfo, setRelayApkInfo] = useState(null);
  
  // Web Profile Sync States
  const [bioText, setBioText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ aw: 'synced', ege: 'synced', tpb: 'warning' });
  const [syncProgress, setSyncProgress] = useState(0);

  const [plans, setPlans] = useState([
    { id: 'free', name: 'Free Tier', prices: { cz: '0 Kč', eu: '0€', uk: '£0', us: '$0' }, description: 'Basic features for individuals', features: ['messaging', 'calendar'], profilesLimit: 1 },
    { id: 'pro', name: 'Pro Agency', prices: { cz: '2490 Kč', eu: '99€', uk: '£85', us: '$109' }, description: 'Advanced features for growing teams', features: ['messaging', 'calendar', 'analytics', 'audit_logs'], profilesLimit: 10 },
    { id: 'enterprise', name: 'Enterprise', prices: { cz: '9990 Kč', eu: '399€', uk: '£345', us: '$449' }, description: 'Full control for large organizations', features: ['messaging', 'calendar', 'analytics', 'audit_logs', 'infrastructure', 'permissions'], profilesLimit: 100 }
  ]);
  const [activeMarket, setActiveMarket] = useState('eu');
  const [clientNotes, setClientNotes] = useState({
    '+420777111222': [
      { id: 1, text: 'Vip client, always tips well.', author: 'Alice', timestamp: 'Yesterday 14:00' },
      { id: 2, text: 'Requires incall only.', author: 'Bob', timestamp: '2 days ago' }
    ]
  });

  useEffect(() => {
    localStorage.setItem('nexus_client_names', JSON.stringify(clientNames));
  }, [clientNames]);

  const axiosWithTiming = useCallback(async (url, config = {}) => {
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
  }, []);

  const initData = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    
    setIsDataLoading(true);
    try {
      const startTime = performance.now();
      console.log('[Performance] Starting parallel data fetch...');

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
      } else if (selfRes?.status === 401) {
        console.warn('[Auth] Session invalid, redirecting to login...');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_isLoggedIn');
          // We let the App component handle redirection based on isLoggedIn state
        }
      }

      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      }

      // 1. Process Safety Session
      if (safetyRes?.data) {
        setActiveSafetySession(safetyRes.data);
        setIsTimerActive(true);
        const endAt = new Date(safetyRes.data.plannedEndAt).getTime();
        const now = Date.now();
        setTimeLeft(Math.floor((endAt - now) / 1000));
      }

      // 2. Process Profiles
      if (profileRes?.data && profileRes.data.length > 0) {
        const sanitizedProfiles = profileRes.data.map(p => {
          let name = p.name;
          if (p.id === 'ldn-01' && (p.name?.includes('Sophie') || !p.name)) {
            name = 'Diana (Central London)';
          }
          return { ...p, name, status: 'online' }; 
        });
        setProfiles(sanitizedProfiles);
      }

      // 3. Process Chats/Messages
      if (chatRes?.data && chatRes.data.length > 0) {
        const mappedMessages = chatRes.data.map(chat => {
          const latestMessage = chat.messages?.[0] || {};
          const resolvedText = latestMessage.text || latestMessage.content || latestMessage.body || latestMessage.message || 'No messages yet';
          const resolvedTransport = latestMessage.transport || latestMessage.type || 'sms';
          const resolvedTimestamp = chat.lastMessageAt || latestMessage.timestamp || latestMessage.createdAt || new Date().toISOString();

          return {
            id: chat.id,
            chatId: chat.id,
            profileId: normalizeProfileId ? normalizeProfileId(chat.profileId) : chat.profileId,
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
        if (setMessages) setMessages(mappedMessages);
      }

      // 4. Process Agency Users (Team)
      if (userRes?.data && userRes.data.length > 0) {
        setOperators(userRes.data);
      }

      // 5. Process Device Bindings
      if (bindingRes?.data && bindingRes.data.ok) {
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
      if (agencyRes?.data) {
        setAgencies(agencyRes.data);
      }
    } catch (err) {
      console.warn('[Performance] Error in optimized initData:', err.message);
    } finally {
      setIsDataLoading(false);
    }
  }, [isLoggedIn, token, API_BASE, axiosWithTiming, normalizeProfileId, setMessages, setActiveOperator, setActiveSafetySession, setIsTimerActive, setTimeLeft]);

  const handleSaveBio = useCallback(async () => {
    if (!activeProfileId) return;
    try {
      await axios.patch(`${API_BASE}/profiles/${activeProfileId}`, { description: bioText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Bio saved!');
      initData();
    } catch (err) { console.error(err); }
  }, [activeProfileId, bioText, token, API_BASE, initData]);

  const handleSyncAll = useCallback(() => {
    setIsSyncing(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  }, []);

  const [isStartingSubscription, setIsStartingSubscription] = useState(false);
  const daysLeft = activeSubscription ? 14 : 0; // Mock calculation

  const onStartSubscription = useCallback(async (planId) => {
    setIsStartingSubscription(true);
    try {
      await axios.post(`${API_BASE}/billing/subscribe`, { planId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Subscribed to ${planId}`);
      initData();
    } catch (err) { console.error(err); }
    finally { setIsStartingSubscription(false); }
  }, [token, API_BASE, initData]);

  const onCancelSubscription = useCallback(async () => {
    if (!window.confirm('Cancel subscription?')) return;
    try {
      await axios.post(`${API_BASE}/billing/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Subscription cancelled');
      initData();
    } catch (err) { console.error(err); }
  }, [token, API_BASE, initData]);




  const fetchAgencies = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    try {
      const res = await axios.get(`${API_BASE}/agency/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgencies(res.data);
    } catch (err) {
      console.error('Failed to fetch agencies:', err);
    }
  }, [isLoggedIn, token, API_BASE]);

  const fetchGlobalFeatures = useCallback(async (operator) => {
    if (!token || !operator || (operator.role?.name || operator.role || '').toUpperCase() !== 'APP OWNER') return;
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
  }, [token, API_BASE]);
  
  // Handlers (Moved from App.jsx)
  const handleRevokeBinding = useCallback(async (installationId) => {
    try {
      await axios.post(`${API_BASE}/device/revoke-binding`, { installationId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initData();
      return true;
    } catch (err) {
      console.error('Revoke error:', err);
      return false;
    }
  }, [token, API_BASE, initData]);

  const handleSaveAssignees = useCallback(async (profileId, userIds) => {
    try {
      const res = await axios.patch(`${API_BASE}/profiles/${profileId}/assignees`, { userIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, assignees: res.data.assignees } : p));
      return true;
    } catch (err) {
      console.error('Failed to save assignees:', err);
      return false;
    }
  }, [token, API_BASE]);

  const toggleOperatorStatus = useCallback(async (profileId, operatorId) => {
    try {
      await axios.post(`${API_BASE}/profiles/${profileId}/toggle-operator`, { operatorId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initData();
    } catch (err) {
      console.error('Failed to toggle operator status:', err);
    }
  }, [token, API_BASE, initData]);

  const handleEditProfile = useCallback((profile) => {
    // This usually opens a modal or navigates to settings
    // In this app, it might trigger a specific global modal if implemented
    alert('Edit profile logic: ' + profile.name);
  }, []);

  const handleAddAgency = useCallback(() => {
    const name = window.prompt('Agency Name:');
    if (!name) return;
    axios.post(`${API_BASE}/agency`, { name }, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => initData())
      .catch(err => console.error(err));
  }, [API_BASE, token, initData]);

  const handleDeleteAgency = useCallback(async (id) => {
    if (!window.confirm('Delete agency?')) return;
    try {
      await axios.delete(`${API_BASE}/agency/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      initData();
    } catch (err) { console.error(err); }
  }, [API_BASE, token, initData]);

  const handleFeatureToggle = useCallback((feature, index) => {
    setGlobalFeatures(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], active: !copy[index].active };
      return copy;
    });
  }, []);

  const updateAgencySettings = useCallback(async (newData) => {
    try {
      const res = await axios.patch(`${API_BASE}/agency/settings`, newData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgencySettings(res.data);
      return true;
    } catch (err) {
      console.error('Failed to update agency settings:', err);
      return false;
    }
  }, [token, API_BASE]);

  const handleExportICS = useCallback(() => {
    const icsUrl = `${API_BASE}/profiles/${activeProfileId}/calendar.ics?token=${token}`;
    window.open(icsUrl, '_blank');
  }, [API_BASE, activeProfileId, token]);

  const handleSaveCalendarSync = useCallback(async () => {
    if (!calendarSyncUrl || !activeProfileId) return;
    try {
      await axios.post(`${API_BASE}/profiles/${activeProfileId}/calendar/sync`, 
        { url: calendarSyncUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsCalendarSyncOpen(false);
      setCalendarSyncUrl('');
      initData();
    } catch (err) {
      console.error('Failed to sync calendar:', err);
    }
  }, [calendarSyncUrl, activeProfileId, token, API_BASE, initData]);

  const handleEditBooking = useCallback((booking) => {
    setSelectedScheduleEvent(booking);
    setNewBookingForm({
      id: booking.id,
      title: booking.title,
      date: booking.date || new Date().toISOString().split('T')[0],
      startTime: booking.time?.split(' - ')[0] || '10:00',
      endTime: booking.time?.split(' - ')[1] || '11:00',
      locationType: booking.locationType || 'incall'
    });
    setIsBookingModalOpen(true);
  }, []);

  const handleDeleteBooking = useCallback(async (bookingId) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      await axios.delete(`${API_BASE}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initData();
    } catch (err) {
      console.error('Failed to delete booking:', err);
    }
  }, [token, API_BASE, initData]);

  const handleQuickSaveMeeting = useCallback(async (meeting) => {
    try {
      await axios.post(`${API_BASE}/bookings`, {
        profileId: activeProfileId,
        title: `Meeting: ${meeting.time}`,
        date: meeting.date,
        startTime: meeting.time,
        duration: meeting.duration
      }, { headers: { Authorization: `Bearer ${token}` } });
      initData();
    } catch (err) {
      console.error('Failed to quick save meeting:', err);
    }
  }, [activeProfileId, token, API_BASE, initData]);

  return {
    profiles, setProfiles,
    agencies, setAgencies,
    agencySettings, setAgencySettings,
    operators, setOperators,
    sessions, setSessions,
    stats, setStats,
    activeSubscription, setActiveSubscription,
    subscriptionHistory, setSubscriptionHistory,
    globalFeatures, setGlobalFeatures,
    auditLogs, setAuditLogs,
    isDataLoading,
    clientNames, setClientNames,
    bookingSchedule, setBookingSchedule,
    isCalendarSyncOpen, setIsCalendarSyncOpen,
    calendarSyncUrl, setCalendarSyncUrl,
    openBookingMenuId, setOpenBookingMenuId,
    isBookingModalOpen, setIsBookingModalOpen,
    selectedScheduleEvent, setSelectedScheduleEvent,
    newBookingForm, setNewBookingForm,
    relayApkInfo, setRelayApkInfo,
    bioText, setBioText,
    isSyncing, setIsSyncing,
    syncStatus, setSyncStatus,
    syncProgress, setSyncProgress,
    handleSaveBio, 
    handleSyncAll,
    assignedProfiles: profiles,
    isStartingSubscription,
    onStartSubscription,
    onCancelSubscription,
    daysLeft,
    handleFeatureToggle,
    plans, setPlans,
    activeMarket, setActiveMarket,
    subscriptionPlans: plans, setSubscriptionPlans: setPlans,
    currentAgency: agencies[0],
    clientNotes, setClientNotes,
    updateClientName: (phoneNumber, name) => {
      setClientNames(prev => ({ ...prev, [phoneNumber]: name }));
    },
    handleRevokeBinding,
    handleSaveAssignees,
    toggleOperatorStatus,
    handleEditProfile,
    handleAddAgency,
    handleDeleteAgency,
    handleAgencyDetail: (a) => alert(`Detail for ${a.name}`),
    handleImpersonateAgency: (a) => alert(`Impersonating ${a.name}`),
    handleToggleAgencyStatus: (id) => alert(`Toggle status for ${id}`),
    updateAgencySettings,
    handleExportICS,
    handleSaveCalendarSync,
    handleEditBooking,
    handleDeleteBooking,
    handleQuickSaveMeeting,
    initData,
    fetchAgencies,
    fetchGlobalFeatures
  };
}
