const admin = require('firebase-admin');
const prisma = require('./db');

let firebaseApp = null;

const getFirebaseApp = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    if (admin.apps.length > 0) {
      firebaseApp = admin.app();
      return firebaseApp;
    }

    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
      const credentials = JSON.parse(inlineJson);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials)
      });
      return firebaseApp;
    }

    // Falls back to GOOGLE_APPLICATION_CREDENTIALS when running on server.
    firebaseApp = admin.initializeApp();
    return firebaseApp;
  } catch (error) {
    console.warn('[Push] Firebase init failed:', error.message);
    return null;
  }
};

const getMessaging = () => {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  return admin.messaging(app);
};

const ensureString = (value) => (value == null ? '' : String(value));

const buildChatPushPayload = ({ profileId, chatId, from, messagePreview, profileName }) => ({
  notification: {
    title: 'New message',
    body: `${profileName || 'Chat'}: ${messagePreview || ''}`.trim()
  },
  data: {
    type: 'new_message',
    targetType: 'inbox',
    profileId: ensureString(profileId),
    chatId: ensureString(chatId),
    from: ensureString(from),
    messagePreview: ensureString(messagePreview),
    notificationId: `msg-${ensureString(chatId) || Date.now()}`,
    timestamp: new Date().toISOString()
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'nexus-events',
      clickAction: 'OPEN_CHAT'
    }
  }
});

const buildCallPushPayload = ({ profileId, from, caller, profileName, callState }) => ({
  notification: {
    title: 'Incoming Call',
    body: `${profileName || 'Profile'} · ${caller || from || 'Unknown caller'}`
  },
  data: {
    type: 'incoming_call',
    targetType: 'call',
    profileId: ensureString(profileId),
    from: ensureString(from),
    caller: ensureString(caller || from),
    callState: ensureString(callState || 'RINGING'),
    notificationId: `call-${Date.now()}`,
    timestamp: new Date().toISOString()
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'nexus-events',
      clickAction: 'OPEN_CALL'
    }
  }
});

const registerPushToken = async ({ userId, agencyId, token, platform = 'android' }) => {
  if (!userId || !token) {
    return { ok: false, message: 'Missing userId or token' };
  }

  try {
    await prisma.pushDevice.upsert({
      where: { token },
      update: {
        userId,
        agencyId: agencyId || null,
        platform,
        active: true,
        lastSeenAt: new Date()
      },
      create: {
        userId,
        agencyId: agencyId || null,
        token,
        platform,
        active: true,
        lastSeenAt: new Date()
      }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const getAgencyTokens = async (agencyId) => {
  const rows = await prisma.pushDevice.findMany({
    where: {
      agencyId: agencyId || null,
      active: true
    },
    select: { token: true }
  });
  return rows.map((row) => row.token).filter(Boolean);
};

const deactivateToken = async (token) => {
  try {
    await prisma.pushDevice.updateMany({
      where: { token },
      data: { active: false }
    });
  } catch (error) {
    console.warn('[Push] Could not deactivate token:', token, error.message);
  }
};

const sendMulticast = async (tokens, payload) => {
  if (!tokens.length) {
    return { sent: 0, failed: 0, details: 'No active tokens for audience' };
  }

  const messaging = getMessaging();
  if (!messaging) {
    return { sent: 0, failed: tokens.length, details: 'Firebase not configured' };
  }

  const response = await messaging.sendEachForMulticast({
    tokens,
    ...payload
  });

  response.responses.forEach((item, index) => {
    if (!item.success && item.error?.code === 'messaging/registration-token-not-registered') {
      void deactivateToken(tokens[index]);
    }
  });

  return {
    sent: response.successCount,
    failed: response.failureCount
  };
};

const sendChatPush = async ({ agencyId, profileId, chatId, from, messagePreview, profileName }) => {
  const tokens = await getAgencyTokens(agencyId);
  const payload = buildChatPushPayload({ profileId, chatId, from, messagePreview, profileName });
  return sendMulticast(tokens, payload);
};

const sendCallPush = async ({ agencyId, profileId, from, caller, profileName, callState }) => {
  const tokens = await getAgencyTokens(agencyId);
  const payload = buildCallPushPayload({ profileId, from, caller, profileName, callState });
  return sendMulticast(tokens, payload);
};

module.exports = {
  registerPushToken,
  buildChatPushPayload,
  buildCallPushPayload,
  sendChatPush,
  sendCallPush
};

