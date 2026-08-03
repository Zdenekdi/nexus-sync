import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import axios from 'axios';

// Stav držíme mimo closure záměrně.
//
// Dřív se přístupový token zachytil do posluchače v okamžiku inicializace. Když
// se pak obnovil (a to se děje pravidelně), posílala registrace FCM tokenu pořád
// ten starý → server ji odmítl 401 a token se NIKDY neuložil. Push tím pádem
// nefungoval vůbec — ani bezpečnostní upozornění, ani fantomový hovor —, protože
// server neměl komu poslat. Navíc se to nikde neprojevilo než jednou řádkou v konzoli.
let listenersAttached = false;
let registeredFcmToken = null;   // poslední token úspěšně uložený na server
let lastFcmToken = null;         // poslední token vydaný Firebase
let authToken = null;            // AKTUÁLNÍ přístupový token, ne ten z inicializace
let apiBaseUrl = null;

const syncTokenToServer = async () => {
  if (!lastFcmToken || !authToken || !apiBaseUrl) return;
  if (registeredFcmToken === lastFcmToken) return;   // už uloženo

  try {
    await axios.post(
      `${apiBaseUrl}/device/push-token`,
      { token: lastFcmToken, platform: Capacitor.getPlatform() },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    registeredFcmToken = lastFcmToken;
    console.log('[Push] Token registered with server');
  } catch (_err) {
    // Necháme registeredFcmToken nenastavené, aby se to zkusilo znovu, jakmile
    // přijde čerstvý přístupový token (typicky po jeho obnovení).
    console.error('[Push] Token registration failed:', _err.message);
  }
};

export const initPushNotifications = async (apiBase, token, onNotification) => {
  if (!Capacitor.isNativePlatform()) return;

  // Aktualizuj přihlašovací údaje při KAŽDÉM volání — tohle je ta oprava:
  // po obnovení tokenu se dřív neúspěšná registrace teď dotáhne.
  apiBaseUrl = apiBase;
  authToken = token;

  if (listenersAttached) {
    await syncTokenToServer();
    return;
  }

  try {
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return;
    }

    listenersAttached = true;   // posluchače registruj jen jednou

    PushNotifications.addListener('registration', async ({ value: fcmToken }) => {
      console.log('[Push] FCM token:', fcmToken?.substring(0, 20) + '...');
      lastFcmToken = fcmToken;
      await syncTokenToServer();
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

    await PushNotifications.register();
  } catch (_err) {
    listenersAttached = false;
    console.warn('[Push] Init failed (not native?):', _err.message);
  }
};

export const removePushListeners = async () => {
  try {
    await PushNotifications.removeAllListeners();
    listenersAttached = false;
    registeredFcmToken = null;
  } catch (_err) {
    console.warn('[Push] Failed to remove listeners:', _err.message);
  }
};
