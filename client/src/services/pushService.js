import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import axios from 'axios';

let registered = false;

export const initPushNotifications = async (apiBase, token, onNotification) => {
  if (!Capacitor.isNativePlatform() || registered) return;

  try {
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async ({ value: fcmToken }) => {
      console.log('[Push] FCM token:', fcmToken?.substring(0, 20) + '...');
      try {
        await axios.post(`${apiBase}/device/push-token`, 
          { token: fcmToken, platform: Capacitor.getPlatform() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        registered = true;
      } catch (_err) {
        console.error('[Push] Token registration failed:', _err.message);
      }
    });

    PushNotifications.addListener('registrationError', (_err) => {
      console.error('[Push] Registration _err:', _err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification.data?.type);
      if (onNotification) onNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data;
      if (data?.targetType === 'inbox' || data?.targetType === 'call') {
        if (onNotification) onNotification(action.notification, true);
      }
    });
  } catch (_err) {
    console.warn('[Push] Init failed (not native?):', _err.message);
  }
};

export const removePushListeners = async () => {
  try {
    await PushNotifications.removeAllListeners();
    registered = false;
  } catch (_err) {
    console.warn('[Push] Failed to remove listeners:', _err.message);
  }
};
