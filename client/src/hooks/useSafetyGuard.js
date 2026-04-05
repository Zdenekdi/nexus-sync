import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Geolocation } from '@capacitor/geolocation';

export const useSafetyGuard = ({
  token,
  API_BASE,
  activeProfileId,
  _activeOperator,
  activeSafetySession,
  setActiveSafetySession,
  _activeTimerEvent,
  setActiveTimerEvent,
  isTimerActive,
  setIsTimerActive,
  timeLeft,
  setTimeLeft,
  addNotification,
  playNotificationSound,
  showToast,
  isMobile
}) => {
  const [safetyAlarmTriggered, setSafetyAlarmTriggered] = useState(false);
  const [isSafetyLoading, setIsSafetyLoading] = useState(false);
  const [departureCheckActive, setDepartureCheckActive] = useState(false);
  const [departureTimeLeft, setDepartureTimeLeft] = useState(0);
  const [departureSessionId, setDepartureSessionId] = useState(null);
  const [departureIntervalMin, setDepartureIntervalMin] = useState(
    () => parseInt(localStorage.getItem('nexus_departure_interval') || '15', 10)
  );
  
  const lastLocationUpdateRef = useRef(0);

  // 1. Safety Guard Timer Logic
  useEffect(() => {
    let interval = null;
    if (isTimerActive && timeLeft > -660) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft <= -660) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft, setTimeLeft]);

  // 2. Threshold Notifications
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

  // 3. Repeating Alarm (Vibrate + Sound + Native Push)
  useEffect(() => {
    if (!safetyAlarmTriggered) return;
    const fire = () => {
      playNotificationSound('emergency');
      try { navigator.vibrate?.([600, 200, 600, 200, 600]); } catch {}
      if (window.Notification?.permission === 'granted' && document.hidden) {
        try { 
          new window.Notification('⏰ SESSION ENDED', { 
            body: 'Prosím proveď CHECK-OUT!', 
            tag: 'safety-alarm', 
            requireInteraction: true 
          }); 
        } catch {}
      }
    };
    fire();
    const interval = setInterval(fire, 40000);
    return () => clearInterval(interval);
  }, [safetyAlarmTriggered, playNotificationSound]);

  // 4. Departure Countdown
  useEffect(() => {
    if (!departureCheckActive || departureTimeLeft <= 0) return;
    const tick = setInterval(() => {
      setDepartureTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          if (departureSessionId) {
            axios.post(`${API_BASE}/safety/sessions/${departureSessionId}/departure-timeout`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(e => console.warn('[Departure] escalation failed', e));
          }
          setDepartureCheckActive(false);
          addNotification({ 
            title: '🚨 Odchod klienta nepotvrzeno', 
            message: 'Bezpečnostní alert odeslán operátorce a managerce.', 
            priority: 'emergency', 
            timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }), 
            read: false 
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [departureCheckActive, departureTimeLeft, departureSessionId, API_BASE, token, addNotification]);

  // 5. GPS Tracking
  useEffect(() => {
    if (!isTimerActive || !activeSafetySession || !isMobile) return;

    let watchId = null;
    const startTracking = async () => {
      try {
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted' && permStatus.location !== 'limited') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted' && req.location !== 'limited') return;
        }

        watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }, (position, err) => {
          if (err || !position || !position.coords) return;
          const isOutcall = activeSafetySession.locationType === 'outcall';
          const shouldSend = isOutcall || safetyAlarmTriggered;
          if (!shouldSend) return;

          const now = Date.now();
          if (now - lastLocationUpdateRef.current < 60000) return;

          lastLocationUpdateRef.current = now;
          axios.post(`${API_BASE}/safety/sessions/${activeSafetySession.id}/location`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString()
          }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        });
      } catch (e) {
        console.error('[GPS] Watch failed:', e);
      }
    };
    startTracking();
    return () => { if (watchId) Geolocation.clearWatch({ id: watchId }); };
  }, [isTimerActive, activeSafetySession, isMobile, API_BASE, token, safetyAlarmTriggered]);

  // Handlers
  const handleCheckIn = useCallback(async (event) => {
    try {
      setIsSafetyLoading(true);
      const durationMatch = event.duration.match(/(\d+)h/);
      const graceMinutes = 10;
      const plannedEndAt = new Date(Date.now() + (durationMatch ? parseInt(durationMatch[1]) : 1) * 3600000);
      
      const response = await axios.post(`${API_BASE}/safety/sessions`, {
        profileId: activeProfileId,
        bookingId: event.id,
        plannedEndAt,
        graceMinutes,
        locationType: event.locationType || 'incall'
      }, { headers: { Authorization: `Bearer ${token}` } });

      setActiveSafetySession(response.data);
      setActiveTimerEvent(event);
      setTimeLeft((durationMatch ? parseInt(durationMatch[1]) : 1) * 3600);
      setIsTimerActive(true);
      setSafetyAlarmTriggered(false);

      addNotification({
        title: 'Safety Guard Active',
        message: `Session started for ${event.title}.`,
        priority: 'success',
        timestamp: new Date().toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
        read: false
      });
    } catch (error) {
      console.error('Check-in failed:', error);
      showToast('Could not start safety session', 'error');
    } finally {
      setIsSafetyLoading(false);
    }
  }, [activeProfileId, API_BASE, token, setActiveSafetySession, setIsTimerActive, setTimeLeft, addNotification, showToast]);

  const handleCheckOut = useCallback(async () => {
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

      setDepartureSessionId(sessionId);
      setDepartureTimeLeft(departureIntervalMin * 60);
      setDepartureCheckActive(true);

      showToast('Checkout OK', 'success');
    } catch (error) {
      console.error('Check-out failed:', error);
      showToast('Checkout failed', 'error');
    } finally {
      setIsSafetyLoading(false);
    }
  }, [activeSafetySession, API_BASE, token, setIsTimerActive, setActiveSafetySession, setTimeLeft, departureIntervalMin, showToast]);

  const handleDepartureConfirmed = useCallback(async () => {
    setDepartureCheckActive(false);
    if (departureSessionId) {
      try {
        await axios.post(`${API_BASE}/safety/sessions/${departureSessionId}/departure-confirmed`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }
    setDepartureSessionId(null);
    showToast('Departure confirmed', 'success');
  }, [departureSessionId, API_BASE, token, showToast]);

  const handleSafetyImOk = useCallback(async () => {
    if (!activeSafetySession) return;
    try {
      setIsSafetyLoading(true);
      await axios.post(`${API_BASE}/safety/sessions/${activeSafetySession.id}/ack`, { extendMinutes: 10 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeLeft(600);
      setSafetyAlarmTriggered(false);
      showToast('Safety acknowledged', 'success');
    } catch (error) {
      console.error('Acknowledge failed:', error);
      showToast('Acknowledge failed', 'error');
    } finally {
      setIsSafetyLoading(false);
    }
  }, [activeSafetySession, API_BASE, token, setTimeLeft, showToast]);

  const handlePanic = useCallback(async () => {
    let sessionId = activeSafetySession?.id;
    try {
      if (!sessionId) {
        const res = await axios.post(`${API_BASE}/safety/sessions`, {
          profileId: activeProfileId, graceMinutes: 0
        }, { headers: { Authorization: `Bearer ${token}` } });
        sessionId = res.data.id;
      }
      await axios.post(`${API_BASE}/safety/sessions/${sessionId}/panic`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSafetyAlarmTriggered(true);
      playNotificationSound('emergency');
      showToast('PANIC ALERT SENT', 'error');
    } catch (err) {
      console.error('Panic failed:', err);
    }
  }, [activeSafetySession, activeProfileId, API_BASE, token, playNotificationSound, showToast]);

  const formatSafetyTime = useCallback((seconds) => {
    const absSec = Math.abs(seconds);
    const h = Math.floor(absSec / 3600);
    const m = Math.floor((absSec % 3600) / 60);
    const s = absSec % 60;
    return `${seconds < 0 ? '-' : ''}${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    safetyAlarmTriggered,
    isSafetyLoading,
    departureCheckActive,
    departureTimeLeft,
    departureIntervalMin,
    setDepartureIntervalMin,
    handleCheckIn,
    handleCheckOut,
    handleDepartureConfirmed,
    handleSafetyImOk,
    handlePanic,
    formatSafetyTime
  };
};
