import { useState, useCallback, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

export const useNotifications = ({ 
  isNativeApp, 
  isAppVisible, 
  t, 
  activeRole, 
  activeOperator, 
  rolePermissions 
}) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('nexus_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [toasts, setToasts] = useState([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexus_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

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
    } catch {
      console.warn('Audio feedback blocked or not supported');
    }
  }, []);

  const scheduleSystemNotification = useCallback(async (notification) => {
    if (!isNativeApp || isAppVisible) return;

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
    } catch (_err) {
      console.warn('[Notifications] Failed to schedule local notification', _err);
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

    if (activeRole === 'App Owner' && resolvedType !== 'emergency') return;

    // Visibility checks
    const isBookingMsg = [summary, title, message].some(value => value === t('newBooking') || value === 'New Booking');
    if (isBookingMsg && activeRole !== 'Model') return;
    if (activeRole === 'Model' && resolvedProfileId && resolvedProfileId !== activeOperator?.profileId) return;

    const operatorRole = activeOperator?.role || 'Operator';
    const perms = rolePermissions[operatorRole] || {};
    if (!perms.messaging && resolvedType !== 'emergency') return;

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
      timestamp: payload.timestamp || new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
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

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const markNotificationRead = useCallback((notificationId) => {
    if (notificationId == null) return;
    setNotifications(prev => prev.map(item => item.id === notificationId ? { ...item, read: true } : item));
    setToasts(prev => prev.filter(item => item.id !== notificationId));
  }, []);

  return {
    notifications,
    setNotifications,
    toasts,
    setToasts,
    notificationPanelOpen,
    setNotificationPanelOpen,
    addNotification,
    showToast,
    markNotificationRead
  };
};
