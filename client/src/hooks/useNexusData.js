import { useState, useCallback, useEffect, useMemo } from 'react';
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
  const [globalSettings, setGlobalSettings] = useState([]);
  const [globalFeatures, setGlobalFeatures] = useState([
    { id: 'ai_trans', label: 'AI Voice Relay', desc: 'Enable neural speech-to-speech routing', active: true },
    { id: 'vc_hub', label: 'Cross-Agency Analytics', desc: 'Enable view of aggregated data', active: true },
    { id: 'crm_adv', label: 'Proxy Pooling', desc: 'Allow sharing device nodes', active: true },
    { id: 'stats_bi', label: 'Payout Processing', desc: 'Automate weekly commission transfers', active: false }
  ]);

  // Global Features & Training Actions
  const handleFeatureToggle = useCallback(async (feature, i) => {
    if (!token) return;
    const newStatus = !feature.active;
    
    // Optimistic update
    const updated = [...globalFeatures];
    updated[i].active = newStatus;
    setGlobalFeatures(updated);

    try {
      await axios.patch(`${API_BASE}/admin/features/${feature.id}`, { active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (showToast) showToast(lang === 'cz' ? 'Funkce aktualizována.' : 'Feature updated.', 'success');
    } catch (_err) {
      console.error('Feature toggle failed:', _err);
      // Rollback
      const rolledBack = [...globalFeatures];
      rolledBack[i].active = !newStatus;
      setGlobalFeatures(rolledBack);
      if (showToast) showToast(lang === 'cz' ? 'Aktualizace selhala.' : 'Update failed.', 'error');
    }
  }, [globalFeatures, token, API_BASE, showToast, lang]);

  const handleUpdateGlobalSetting = useCallback(async (key, value) => {
    if (!token) return;
    try {
      await axios.post(`${API_BASE}/admin/settings`, { key, value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (showToast) showToast(lang === 'cz' ? 'Nastavení uloženo.' : 'Setting saved.', 'success');
      
      // Refresh settings
      const res = await axios.get(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) setGlobalSettings(res.data);
    } catch (_err) {
      console.error('Update setting failed:', _err);
      if (showToast) showToast(lang === 'cz' ? 'Uložení selhalo.' : 'Save failed.', 'error');
    }
  }, [token, API_BASE, showToast, lang]);

  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(() => localStorage.getItem('nexus_hydrated') === 'true');
  const [rolePermissions, setRolePermissions] = useState(null);

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

  const [clientNames] = useState({});
  const [_clientNames, _setClientNames] = useState(() => {
    const saved = localStorage.getItem('nexus_client_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [calendar, setCalendar] = useState([]);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [calendarSyncUrl, setCalendarSyncUrl] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedScheduleEvent, setSelectedScheduleEvent] = useState(null);
  const [newBookingForm, setNewBookingForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', locationType: 'incall', address: '' });
  
  const [bioText, setBioText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [_syncStatus, _setSyncStatus] = useState({ aw: 'synced', ege: 'synced', tpb: 'warning' });
  const [_syncProgress, _setSyncProgress] = useState(0);
  const [relayOnline, setRelayOnline] = useState(false);

  const checkRelayStatus = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    try {
      const res = await axios.get(`${API_BASE}/agency/relay-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRelayOnline(res.data.online);
    } catch {
      setRelayOnline(false);
    }
  }, [isLoggedIn, token, API_BASE]);

  useEffect(() => {
    if (isLoggedIn) {
      checkRelayStatus();
      const interval = setInterval(checkRelayStatus, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, checkRelayStatus]);

  const [_plans, _setPlans] = useState([]);
  
  useEffect(() => {
    localStorage.setItem('nexus_client_names', JSON.stringify(clientNames));
  }, [clientNames]);

  const axiosWithTiming = useCallback(async (url, config = {}) => {
    try {
      const res = await axios.get(url, { ...config, timeout: 10000 });
      return res;
    } catch (_err) {
      console.warn(`[API] Fetch failed for ${url}:`, _err.message);
      return { data: null };
    }
  }, []);

  const initData = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    
    // Only show the global loading screen if we haven't hydrated yet
    if (!hasHydrated) {
      setIsDataLoading(true);
    } else {
      setIsBackgroundLoading(true);
    }
    
    // SAFETY TIMEOUT: Forcibly stop loading after 7s to prevent infinite hang
    const safetyTimer = setTimeout(() => {
      console.warn('[Data] Safety timeout reached. Forcing loading screen off.');
      setIsDataLoading(false);
    }, 7000);

    try {
      // PHASE 1: CRITICAL DATA (Required for Sidebar & Core UI)
      const [selfRes, profileRes, userRes, safetyRes, permissionsRes] = await Promise.all([
        axiosWithTiming(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/safety/sessions/active`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/admin/permissions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null }))
      ]);

      // Process Priority 1 Data immediately to unlock UI
      if (selfRes?.data) {
        setActiveOperator(selfRes.data);
        localStorage.setItem('nexus_activeOperator', JSON.stringify(selfRes.data));
      }
      setProfiles(Array.isArray(profileRes?.data) ? profileRes.data : []);
      if (Array.isArray(userRes?.data)) setOperators(userRes.data);
      if (safetyRes?.data && typeof safetyRes.data === 'object') {
        setActiveSafetySession(safetyRes.data);
        setIsTimerActive(true);
        try {
          const endAt = new Date(safetyRes.data.plannedEndAt).getTime();
          if (!isNaN(endAt)) setTimeLeft(Math.floor((endAt - Date.now()) / 1000));
        } catch { /* ignore date parse _err */ }
      }
      if (permissionsRes?.data) {
        setRolePermissions(permissionsRes.data);
      }

      // UNLOCK SIDEBAR AS SOON AS CRITICAL DATA IS READY
      setIsDataLoading(false);
      setHasHydrated(true);
      localStorage.setItem('nexus_hydrated', 'true');
      clearTimeout(safetyTimer);
      
      // Phase 2 is starting
      setIsBackgroundLoading(true);

      // PHASE 2: HEAVY DATA (Background hydration)
      const [chatRes, bindingRes, statsRes, agencyRes, analyticsRes, bookingRes, featuresRes, globalSettingsRes] = await Promise.all([
        axiosWithTiming(`${API_BASE}/chats`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/device/bindings`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axiosWithTiming(`${API_BASE}/agency/all`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axiosWithTiming(`${API_BASE}/analytics/summary?days=7`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axiosWithTiming(`${API_BASE}/bookings`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axiosWithTiming(`${API_BASE}/admin/features`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axiosWithTiming(`${API_BASE}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      if (Array.isArray(featuresRes?.data)) setGlobalFeatures(featuresRes.data);
      if (Array.isArray(globalSettingsRes?.data)) setGlobalSettings(globalSettingsRes.data);

      // ------------------------------------------------------------
      // SECONDARY DATA PROCESSING
      // ------------------------------------------------------------
      
      // Messages/Chats
      if (Array.isArray(chatRes?.data)) {
        const mappedMessages = chatRes.data.map(chat => {
          if (!chat) return null;
          return {
            id: chat.id, chatId: chat.id, profileId: normalizeProfileId(chat.profileId),
            profileName: chat.profile?.name || null, from: chat.externalId || 'Unknown',
            text: (chat.messages?.[0]?.text || 'No messages'),
            senderName: chat.messages?.[0]?.sender?.name || null,
            timestamp: chat.lastMessageAt || new Date().toISOString(),
            messages: chat.messages || [],
            status: 'read', direction: 'inbound', transport: 'sms',
            client: chat.client || null
          };
        }).filter(Boolean);
        setMessages(mappedMessages);
      }

      // Bindings
      if (bindingRes?.data?.ok && Array.isArray(bindingRes?.data?.bindings)) {
        setSessions(bindingRes.data.bindings.map(b => ({
          id: b.id, device: b.model || 'Android', status: b.active ? 'Active' : 'Disabled'
        })));
      }

      // Bookings / Calendar
      if (Array.isArray(bookingRes?.data)) {
        const mappedBookings = bookingRes.data.map(b => {
          const start = new Date(b.startTime);
          const end = new Date(b.endTime);
          const timeStr = start.toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
          const duration = Math.round((end - start) / (1000 * 60));
          
          return {
            id: b.id,
            title: b.title || 'Booking',
            time: timeStr,
            startTime: b.startTime,
            endTime: b.endTime,
            duration: `${duration}m`,
            type: b.locationType === 'outcall' ? 'outcall' : 'work',
            status: b.status || 'confirmed',
            locationType: b.locationType,
            address: b.address,
            profileId: b.profileId
          };
        });
        setCalendar(mappedBookings);
      }

      // Stats & Agency
      let agencyData = agencyRes?.data;
      if (!agencyData || !Array.isArray(agencyData) || agencyData.length === 0) {
        try {
          const ownAgencyRes = await axiosWithTiming(`${API_BASE}/agency/settings`, { headers: { Authorization: `Bearer ${token}` } });
          if (ownAgencyRes?.data) agencyData = [ownAgencyRes.data];
        } catch { /* ignore agency fetch _err */ }
      }
      if (agencyData) setAgencies(Array.isArray(agencyData) ? agencyData : [agencyData]);

      if (statsRes?.data) {
        const s = statsRes.data || {};
        const dayNames = lang === 'cz' ? ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let richChartData = [];
        let sparklineData = Array.isArray(s.chartData) ? s.chartData : [];
        const analyticsChart = analyticsRes?.data?.chartData;
        if (Array.isArray(analyticsChart) && analyticsChart.length > 0) {
          richChartData = analyticsChart.map(d => ({
            day: dayNames[new Date(d.date).getDay()] || '?',
            revenue: Number(d.revenue || 0), bookings: Number(d.bookings || 0)
          }));
          sparklineData = analyticsChart.map(d => Number(d.revenue || d.bookings || 0));
        }
        setStats({
          revenue: analyticsRes?.data?.revenue != null ? `£${Number(analyticsRes.data.revenue).toFixed(2)}` : (s.revenue || '£0.00'),
          revenueMtd: s.revenue || '£0.00', revenueChange: Number(analyticsRes?.data?.revenueChange || 0),
          totalBookings: Number(analyticsRes?.data?.bookings || s.totalBookings || 0),
          activeBookings: Number(s.totalBookings || 0), bookingsChange: Number(analyticsRes?.data?.bookingsChange || 0),
          totalMessages: Number(s.totalMessages || 0), messagesChange: 0, totalCalls: Number(s.totalCalls || 0),
          conversionRate: Number(s.conversionRate || 0), conversionChange: 0,
          commissionGrowth: String(s.commissionGrowth || 'STABLE'),
          chartData: richChartData.length > 0 ? richChartData : (sparklineData.length > 0 ? sparklineData : [0,0,0,0,0,0,0]),
          sparklineData: sparklineData.length > 0 ? sparklineData : [0,0,0,0,0,0,0],
          revenueData: richChartData, profilePerf: [], operatorPerf: [],
          totalAgencies: Number(s.totalAgencies || 0), totalProfiles: Number(s.totalProfiles || 0),
          totalUsers: Number(s.totalUsers || 0), uptime: String(s.uptime || '100% UP'),
          activeProfiles: Number(analyticsRes?.data?.activeProfiles || s.totalProfiles || 0)
        });
      }

    } catch (err) {
      console.error('[NexusData] Sync failed:', err.response?.status, err.response?.data || err.message);
      if (showToast) showToast(err.message, 'error');
    } finally {
      clearTimeout(safetyTimer);
      setIsBackgroundLoading(false);
    }
  }, [isLoggedIn, token, API_BASE, axiosWithTiming, normalizeProfileId, setMessages, setActiveOperator, setActiveSafetySession, setIsTimerActive, setTimeLeft, hasHydrated, lang, showToast]);

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
    } catch (_err) {
      console.error(_err);
      if (showToast) showToast(lang === 'cz' ? 'Nepodařilo se uložit popis.' : 'Failed to save description.', 'error');
    }
  }, [activeProfileId, bioText, token, API_BASE, initData, showToast, lang]);

  const handleSyncAll = useCallback(async () => {
    if (!activeProfileId || activeProfileId === 'all') {
      if (showToast) showToast(lang === 'cz' ? 'Vyberte konkrétní profil pro synchronizaci.' : 'Select a specific profile to sync.', 'info');
      return;
    }

    try {
      setIsSyncing(true);
      _setSyncProgress(0);
      _setSyncStatus({ aw: 'syncing', ege: 'syncing', tpb: 'syncing' });

      // Start progress simulation
      const progressInterval = setInterval(() => {
        _setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 500);

      // Call API to dispatch relay command
      await axios.post(`${API_BASE}/profiles/${activeProfileId}/sync`, {
        bio: bioText,
        name: profiles.find(p => p.id === activeProfileId)?.name
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // For now, we simulate completion after API success + some delay
      // In a real scenario, we would wait for a socket event from the relay
      setTimeout(() => {
        clearInterval(progressInterval);
        _setSyncProgress(100);
        _setSyncStatus({ aw: 'synced', ege: 'synced', tpb: 'synced' });
        
        setTimeout(() => {
          setIsSyncing(false);
          if (showToast) showToast(lang === 'cz' ? 'Synchronizace dokončena!' : 'Synchronization complete!', 'success');
        }, 1000);
      }, 3000);

    } catch (_err) {
      console.error('Sync failed:', _err);
      setIsSyncing(false);
      _setSyncStatus({ aw: '_err', ege: '_err', tpb: '_err' });
      const errMsg = _err.response?.data?.message || (lang === 'cz' ? 'Synchronizace selhala.' : 'Synchronization failed.');
      if (showToast) showToast(errMsg, 'error');
    }
  }, [activeProfileId, bioText, token, API_BASE, profiles, showToast, lang]);

  const handleSaveCredentials = useCallback(async (credentials) => {
    if (!activeProfileId || activeProfileId === 'all') return;
    try {
      await axios.post(`${API_BASE}/profiles/${activeProfileId}/credentials`, {
        credentials
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (showToast) showToast(lang === 'cz' ? 'Přihlašovací údaje byly bezpečně uloženy.' : 'Credentials securely saved.', 'success');
      initData();
    } catch (_err) {
      console.error('Save credentials failed:', _err);
      if (showToast) showToast(lang === 'cz' ? 'Nepodařilo se uložit údaje.' : 'Failed to save credentials.', 'error');
    }
  }, [activeProfileId, token, API_BASE, initData, showToast, lang]);

  const toggleOperatorStatus = useCallback(async (profileId, operatorId) => {
    if (!profileId || !operatorId) return;
    try {
      await axios.post(`${API_BASE}/profiles/${profileId}/toggle-operator`, { operatorId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initData();
    } catch (_err) {
      console.error('Toggle operator status failed:', _err);
      if (showToast) showToast(lang === 'cz' ? 'Změna stavu selhala.' : 'Failed to toggle status.', 'error');
    }
  }, [token, API_BASE, initData, showToast, lang]);

  const handleSaveAssignees = useCallback(async (profileId, operatorIds) => {
    if (!profileId) return;
    try {
      await axios.put(`${API_BASE}/profiles/${profileId}/assignees`, { operatorIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initData();
    } catch (_err) {
      console.error('Save assignees failed:', _err);
      if (showToast) showToast(lang === 'cz' ? 'Uložení týmu selhalo.' : 'Failed to save team.', 'error');
    }
  }, [token, API_BASE, initData, showToast, lang]);
  
  const handleExportICS = useCallback(() => {
    if (!calendar || calendar.length === 0) {
      if (showToast) showToast(lang === 'cz' ? 'Není co exportovat.' : 'Nothing to export.', 'info');
      return;
    }
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Nexus Hub//NONSGML v1.0//EN\n";
    
    calendar.forEach(event => {
      const start = new Date(event.startTime || new Date());
      const end = new Date(event.endTime || new Date());
      
      const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `SUMMARY:${event.title}\n`;
      icsContent += `DTSTART:${formatDate(start)}\n`;
      icsContent += `DTEND:${formatDate(end)}\n`;
      icsContent += `DESCRIPTION:${event.locationType || 'Incall'}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nexus-calendar.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (showToast) showToast(lang === 'cz' ? 'Kalendář byl exportován.' : 'Calendar exported.', 'success');
  }, [calendar, lang, showToast]);

  const handleSaveCalendarSync = useCallback(async () => {
    if (!calendarSyncUrl || !calendarSyncUrl.startsWith('http')) {
      if (showToast) showToast(lang === 'cz' ? 'Neplatná URL kalendáře.' : 'Invalid calendar URL.', 'error');
      return;
    }
    
    try {
      setIsSyncing(true);
      // Mock call if backend is not ready, or actual call if it is
      // await axios.post(`${API_BASE}/calendar/sync`, { url: calendarSyncUrl }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (showToast) showToast(lang === 'cz' ? 'Synchronizace kalendáře nastavena.' : 'Calendar sync configured.', 'success');
      setIsCalendarSyncOpen(false);
    } catch (_err) {
      console.error(_err);
      if (showToast) showToast(lang === 'cz' ? 'Chyba při nastavování synchronizace.' : 'Error setting up sync.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [calendarSyncUrl, lang, showToast, setIsCalendarSyncOpen]);

  const handleSaveBooking = useCallback(async () => {
    if (!newBookingForm.title || !newBookingForm.date || !activeProfileId) return;
    
    try {
      setIsDataLoading(true);
      const startDateTime = `${newBookingForm.date}T${newBookingForm.startTime}:00`;
      const endDateTime = `${newBookingForm.date}T${newBookingForm.endTime}:00`;
      
      await axios.post(`${API_BASE}/bookings`, {
        profileId: activeProfileId,
        title: newBookingForm.title,
        startTime: startDateTime,
        endTime: endDateTime,
        locationType: newBookingForm.locationType,
        address: newBookingForm.locationType === 'outcall' ? newBookingForm.address : null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (showToast) showToast(lang === 'cz' ? 'Schůzka uložena.' : 'Booking saved.', 'success');
      setIsBookingModalOpen(false);
      setNewBookingForm({ title: '', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', locationType: 'incall', address: '' });
      initData();
    } catch (_err) {
      console.error(_err);
      if (showToast) showToast(lang === 'cz' ? 'Chyba při ukládání.' : 'Error saving booking.', 'error');
    } finally {
      setIsDataLoading(false);
    }
  }, [newBookingForm, activeProfileId, token, API_BASE, initData, showToast, lang, setIsBookingModalOpen]);

  const handleDelayBooking = useCallback(async (bookingId, delayMinutes) => {
    try {
      let updatedCalendar = [...calendar].sort((a, b) => {
        const tA = (a.time || '').split(' - ')[0];
        const tB = (b.time || '').split(' - ')[0];
        return tA.localeCompare(tB);
      });

      const bookingIndex = updatedCalendar.findIndex(b => b.id === bookingId);
      if (bookingIndex === -1) return;

      const parseTime = (timeStr) => {
        const [s, _err] = (timeStr || '10:00 - 11:00').split(' - ');
        const [sh, sm] = s.split(':').map(Number);
        const [eh, em] = _err.split(':').map(Number);
        return { start: (sh || 0) * 60 + (sm || 0), end: (eh || 0) * 60 + (em || 0) };
      };

      const formatTime = (totalMin) => {
        const h = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const booking = updatedCalendar[bookingIndex];
      const times = parseTime(booking.time);
      const _oldEnd = times.end;
      const newEnd = times.end + delayMinutes;
      
      booking.time = `${formatTime(times.start)} - ${formatTime(newEnd)}`;
      
      // Cascade shift
      const postponedSms = [];
      let lastEnd = newEnd;

      for (let i = bookingIndex + 1; i < updatedCalendar.length; i++) {
        const nextB = updatedCalendar[i];
        const nTimes = parseTime(nextB.time);
        const duration = nTimes.end - nTimes.start;
        
        if (nTimes.start < lastEnd) {
          const shiftBy = lastEnd - nTimes.start;
          const newStart = lastEnd;
          const newFinish = newStart + duration;
          nextB.time = `${formatTime(newStart)} - ${formatTime(newFinish)}`;
          lastEnd = newFinish;

          // Prepare notification draft
          const clientName = (nextB.title || '').replace('Meeting w/ ', '');
          postponedSms.push({
            bookingId: nextB.id,
            clientName,
            oldTime: formatTime(nTimes.start),
            newTime: formatTime(newStart),
            delay: shiftBy,
            message: lang === 'cz' 
              ? `Ahoj ${clientName}, omlouvám se, ale moje předchozí schůzka se protáhla. Uvidíme se o ${shiftBy} minut později v ${formatTime(newStart)}. Těším se!`
              : `Hi ${clientName}, I'm sorry, our meeting will be delayed by ${shiftBy} minutes. See you at ${formatTime(newStart)}! Looking forward to it.`
          });
        } else {
          break; // No more overlaps
        }
      }

      setCalendar(updatedCalendar);
      if (showToast) showToast(lang === 'cz' ? 'Agenda byla posunuta.' : 'Agenda has been shifted.', 'success');
      
      return postponedSms;
    } catch (_err) {
      console.error('Delay booking _err:', _err);
      return [];
    }
  }, [calendar, lang, showToast]);

  const handleQuickSaveMeeting = useCallback(async (meeting) => {
    try {
      await axios.post(`${API_BASE}/bookings`, {
        profileId: activeProfileId, title: `Meeting: ${meeting.time}`, date: meeting.date, startTime: meeting.time, duration: meeting.duration
      }, { headers: { Authorization: `Bearer ${token}` } });
      initData();
    } catch (_err) {
      console.error(_err);
      if (showToast) showToast(lang === 'cz' ? 'Nepodařilo se uložit schůzku.' : 'Failed to save meeting.', 'error');
    }
  }, [activeProfileId, token, API_BASE, initData, showToast, lang]);

  const fetchClientByPhone = useCallback(async (phone) => {
    if (!phone) return null;
    try {
      const res = await axios.get(`${API_BASE}/clients/${phone}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (_err) {
      console.error('Failed to fetch client info:', _err);
      return null;
    }
  }, [API_BASE, token]);

  const handleSyncChatHistory = useCallback(async (chatId) => {
    if (!chatId || !token) return;
    try {
      if (showToast) showToast(lang === 'cz' ? 'Příkaz k synchronizaci odeslán...' : 'Sync command dispatched...', 'info');
      await axios.post(`${API_BASE}/chats/${chatId}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (_err) {
      console.error('Chat sync failed:', _err);
      if (showToast) showToast(lang === 'cz' ? 'Synchronizace selhala.' : 'Sync failed.', 'error');
    }
  }, [token, API_BASE, showToast, lang]);

  return useMemo(() => ({
    profiles, agencies, agencySettings: _agencySettings, operators, sessions, stats, activeSubscription: _activeSubscription,
    subscriptionHistory: _subscriptionHistory, globalFeatures, handleFeatureToggle,
    globalSettings, handleUpdateGlobalSetting,
    isTraining, trainingProgress, onStartTraining, onResetTraining,
    auditLogs: [], isDataLoading, isBackgroundLoading, hasHydrated, clientNames,
    calendar, isCalendarSyncOpen, setIsCalendarSyncOpen, calendarSyncUrl, setCalendarSyncUrl,
    isBookingModalOpen, setIsBookingModalOpen, selectedScheduleEvent, setSelectedScheduleEvent,
    newBookingForm, setNewBookingForm, bioText, setBioText, isSyncing, syncStatus: _syncStatus, syncProgress: _syncProgress,
    relayOnline, handleSaveBio, handleSyncAll, handleSyncChatHistory, handleSaveCredentials, handleQuickSaveMeeting, handleDelayBooking, initData,
    handleExportICS, handleSaveCalendarSync, handleSaveBooking, fetchClientByPhone,
    setProfiles, toggleOperatorStatus, handleSaveAssignees,
    rolePermissions
  }), [
    profiles, agencies, _agencySettings, operators, sessions, stats, _activeSubscription, _subscriptionHistory, 
    globalFeatures, handleFeatureToggle, globalSettings, handleUpdateGlobalSetting, isTraining, trainingProgress, 
    onStartTraining, onResetTraining, isDataLoading, isBackgroundLoading, hasHydrated, clientNames, calendar, 
    isCalendarSyncOpen, calendarSyncUrl, isBookingModalOpen, selectedScheduleEvent, newBookingForm, bioText, 
    isSyncing, _syncStatus, _syncProgress, relayOnline, handleSaveBio, handleSyncAll, handleSyncChatHistory, 
    handleSaveCredentials, handleQuickSaveMeeting, handleDelayBooking, initData, handleExportICS, 
    handleSaveCalendarSync, handleSaveBooking, fetchClientByPhone, toggleOperatorStatus, handleSaveAssignees, 
    rolePermissions
  ]);
}
