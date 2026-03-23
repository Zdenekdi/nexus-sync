const prisma = require('../services/db');
const { registerPushToken, sendChatPush, sendCallPush } = require('../services/pushService');
const { getIO } = require('../services/socket');

const normalizeCallState = (state) => {
  const normalized = `${state || ''}`.replace(/^State:\s*/i, '').trim().toUpperCase();
  return normalized || 'RINGING';
};

const normalizeTransport = (value) => {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (normalized === 'sms' || normalized === 'rcs' || normalized === 'call') {
    return normalized;
  }
  return null;
};

exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform, operatorId } = req.body;
    const userId = req.user?.userId;
    const agencyId = req.user?.agencyId || null;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, message: 'Missing token' });
    }

    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    if (operatorId && operatorId !== userId) {
      console.warn(`[Push] Ignoring mismatched operatorId ${operatorId} for user ${userId}`);
    }

    const result = await registerPushToken({
      userId,
      agencyId,
      token,
      platform: platform || 'android'
    });

    if (!result.ok) {
      return res.status(500).json({ ok: false, message: result.message || 'Could not register push token' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Push token registration error:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
};

exports.verifyDeviceBinding = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const agencyId = req.user?.agencyId || null;
    const { installationId, profileId, platform, model, deviceName } = req.body || {};

    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    if (!installationId || typeof installationId !== 'string' || installationId.length > 256) {
      return res.status(400).json({ ok: false, message: 'Invalid installationId' });
    }

    let resolvedProfileId = null;
    if (profileId != null) {
      if (typeof profileId !== 'string' || profileId.length > 128) {
        return res.status(400).json({ ok: false, message: 'Invalid profileId' });
      }

      const profile = await prisma.profile.findFirst({
        where: {
          id: profileId,
          agencyId: agencyId || undefined,
        },
        select: { id: true },
      });

      if (!profile) {
        return res.status(403).json({ ok: false, message: 'Profile does not belong to your agency' });
      }

      resolvedProfileId = profile.id;
    }

    if (!resolvedProfileId && agencyId) {
      const assignedProfile = await prisma.profile.findFirst({
        where: {
          agencyId,
          assignees: {
            some: {
              id: userId,
            },
          },
        },
        select: { id: true },
      });
      if (assignedProfile) {
        resolvedProfileId = assignedProfile.id;
      }
    }

    const binding = await prisma.$transaction(async (tx) => {
      const current = await tx.deviceBinding.upsert({
        where: { installationId },
        update: {
          userId,
          agencyId,
          profileId: resolvedProfileId,
          platform: typeof platform === 'string' && platform.length <= 32 ? platform : 'android',
          active: true,
          model: typeof model === 'string' && model.length <= 128 ? model : null,
          deviceName: typeof deviceName === 'string' && deviceName.length <= 128 ? deviceName : null,
          lastSeenAt: new Date(),
        },
        create: {
          installationId,
          userId,
          agencyId,
          profileId: resolvedProfileId,
          platform: typeof platform === 'string' && platform.length <= 32 ? platform : 'android',
          active: true,
          model: typeof model === 'string' && model.length <= 128 ? model : null,
          deviceName: typeof deviceName === 'string' && deviceName.length <= 128 ? deviceName : null,
          lastSeenAt: new Date(),
        },
      });

      // Single-device policy: keep only this installation active for this user.
      await tx.deviceBinding.updateMany({
        where: {
          userId,
          installationId: { not: installationId },
          active: true,
        },
        data: { active: false },
      });

      return tx.deviceBinding.findUnique({
        where: { installationId },
        select: {
          id: true,
          installationId: true,
          userId: true,
          agencyId: true,
          profileId: true,
          platform: true,
          active: true,
          updatedAt: true,
        },
      });
    });

    return res.json({ ok: true, binding });
  } catch (error) {
    console.error('Device verification error:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
};

exports.getRelayStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const installationId = req.query?.installationId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    if (!installationId || typeof installationId !== 'string' || installationId.length > 256) {
      return res.status(400).json({ ok: false, message: 'Invalid installationId' });
    }

    const binding = await prisma.deviceBinding.findUnique({
      where: { installationId },
      select: {
        installationId: true,
        userId: true,
        agencyId: true,
        profileId: true,
        active: true,
        platform: true,
        model: true,
        deviceName: true,
        lastSeenAt: true,
        updatedAt: true,
      },
    });

    if (!binding) {
      return res.status(404).json({ ok: true, registered: false, online: false, active: false });
    }

    if (binding.userId !== userId) {
      return res.status(403).json({ ok: false, message: 'Device binding mismatch' });
    }

    // NOTE: Do NOT update lastSeenAt here — this endpoint is polled every 15 s and
    // a write on every call causes excessive SQLite lock contention that blocks
    // concurrent queries (including /api/auth/login).  lastSeenAt is already
    // refreshed by handleRelay whenever the device actually forwards a message.
    const { userId: _uid, ...bindingData } = binding;

    return res.json({
      ok: true,
      registered: true,
      active: Boolean(binding.active),
      online: Boolean(binding.active),
      source: 'device-binding',
      binding: bindingData,
    });
  } catch (error) {
    console.error('Relay status error:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
};

exports.sendTestPush = async (req, res) => {
  try {
    const { type = 'chat', agencyId: requestedAgencyId, profileId, from, messagePreview, callState } = req.body || {};
    const user = req.user || {};

    if (!user.userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    // Non-superadmin users can only target their own agency.
    const targetAgencyId = user.isSuperAdmin ? (requestedAgencyId || user.agencyId) : user.agencyId;
    if (!targetAgencyId) {
      return res.status(400).json({ ok: false, message: 'Missing agencyId context' });
    }

    if (!user.isSuperAdmin && requestedAgencyId && requestedAgencyId !== user.agencyId) {
      return res.status(403).json({ ok: false, message: 'Access denied for target agency' });
    }

    const testProfileId = profileId || 'test-profile';
    const testFrom = from || '+420000000000';

    let result;
    if (type === 'call') {
      result = await sendCallPush({
        agencyId: targetAgencyId,
        profileId: testProfileId,
        from: testFrom,
        caller: testFrom,
        profileName: 'FCM Test Profile',
        callState: callState || 'RINGING'
      });
    } else {
      result = await sendChatPush({
        agencyId: targetAgencyId,
        profileId: testProfileId,
        chatId: `test-${Date.now()}`,
        from: testFrom,
        messagePreview: messagePreview || 'This is a test push message from Nexus Hub backend.',
        profileName: 'FCM Test Profile'
      });
    }

    return res.json({
      ok: true,
      type,
      agencyId: targetAgencyId,
      sent: result.sent || 0,
      failed: result.failed || 0,
      details: result.details || null
    });
  } catch (error) {
    console.error('Test push error:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
};

// Nexus Relay (from RelayMode.jsx in mobile app)
exports.handleRelay = async (req, res) => {
  try {
    const { installationId, deviceId, type, transport, from, content, secret } = req.body;
    const messageTransport = normalizeTransport(transport || type);

    // ── Auth: DEVICE_SECRET required ─────────────────────────────────────────
    if (secret !== process.env.DEVICE_SECRET) {
      console.warn(`[Relay] Unauthorized relay attempt from deviceId=${deviceId} ip=${req.ip}`);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // ── Input validation ──────────────────────────────────────────────────────
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 128) {
      return res.status(400).json({ message: 'Invalid deviceId' });
    }
    if (!installationId || typeof installationId !== 'string' || installationId.length > 256) {
      return res.status(400).json({ message: 'Invalid installationId' });
    }
    if (!messageTransport) {
      return res.status(400).json({ message: 'Invalid or missing transport' });
    }
    if (!from || typeof from !== 'string' || from.length > 64) {
      return res.status(400).json({ message: 'Invalid from field' });
    }
    if (!content || typeof content !== 'string' || content.length > 4096) {
      return res.status(400).json({ message: 'Invalid content field' });
    }

    console.log(`[Relay] ${messageTransport.toUpperCase()} from ${from} (Device: ${deviceId}, Installation: ${installationId})`);

    // Strict mapping: relay traffic must come from a previously verified installation.
    const binding = await prisma.deviceBinding.findUnique({
      where: { installationId },
      select: {
        userId: true,
        agencyId: true,
        profileId: true,
        active: true,
      },
    });

    if (!binding) {
      console.warn(`[Relay] Unknown installationId=${installationId}`);
      return res.status(404).json({ message: 'Device not registered' });
    }

    if (binding.userId !== deviceId) {
      console.warn(`[Relay] Device mismatch installationId=${installationId} expectedUserId=${binding.userId} gotDeviceId=${deviceId}`);
      return res.status(403).json({ message: 'Device binding mismatch' });
    }

    if (!binding.active) {
      console.warn(`[Relay] Inactive device binding installationId=${installationId}`);
      return res.status(403).json({ message: 'Device is no longer active' });
    }

    await prisma.deviceBinding.update({
      where: { installationId },
      data: { lastSeenAt: new Date() },
    });

    const agencyId = binding.agencyId;
    if (!agencyId) {
      return res.status(404).json({ message: 'No agency context found' });
    }

    if (!binding.profileId) {
      return res.status(409).json({ message: 'No profile is bound to this device' });
    }

    const profile = await prisma.profile.findFirst({
      where: {
        id: binding.profileId,
        agencyId,
      },
      select: { id: true },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Bound profile not found for agency context' });
    }

    if (messageTransport === 'sms' || messageTransport === 'rcs') {
      let chat = await prisma.chat.findUnique({
        where: { externalId_profileId: { externalId: from, profileId: profile.id } }
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: { externalId: from, profileId: profile.id, agencyId }
        });
      }

      const createdMessage = await prisma.message.create({
        data: {
          chatId: chat.id,
          text: content,
          transport: messageTransport,
          direction: 'INBOUND',
          status: 'delivered'
        }
      });

      await prisma.chat.update({
        where: { id: chat.id },
        data: { lastMessageAt: new Date() }
      });

      try {
        getIO().to(`agency_${agencyId}`).emit('new_message', {
          id: createdMessage.id,
          profileId: profile.id,
          chatId: chat.id,
          from,
          text: content,
          transport: messageTransport,
          type: messageTransport,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered',
          direction: 'inbound',
          sender: null
        });
      } catch (e) {
        console.warn('[Relay] Socket emit failed', e.message);
      }

      try {
        await sendChatPush({
          agencyId,
          profileId: profile.id,
          chatId: createdMessage.id,
          from,
          messagePreview: content,
          profileName: profile.name
        });
      } catch (e) {
        console.warn(`[Relay] Push send failed for ${messageTransport}`, e.message);
      }
    } else if (messageTransport === 'call') {
      const callState = normalizeCallState(content);

      await prisma.callLog.create({
        data: {
          profileId: profile.id,
          from: from || 'UNKNOWN',
          status: callState
        }
      });

      try {
        getIO().to(`agency_${agencyId}`).emit('incoming_call', {
          profileId: profile.id,
          from,
          profileName: profile.name,
          state: callState
        });
      } catch (e) {
        console.warn('[Relay] Socket emit failed for call', e.message);
      }

      try {
        await sendCallPush({
          agencyId,
          profileId: profile.id,
          from,
          caller: from,
          profileName: 'Relay Inbound',
          callState
        });
      } catch (e) {
        console.warn('[Relay] Push send failed for call', e.message);
      }
    } else {
      return res.status(400).json({ message: 'Unsupported relay transport' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Relay handling error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GoIP sends data as application/x-www-form-urlencoded
// Expected fields: src (sender), dst (receiver/SIM), msg (text), time
exports.handleGoIP = async (req, res) => {
  try {
    const { src, dst, msg } = req.body;
    if (!src || !dst || !msg) {
      return res.status(400).json({ message: 'Missing required GoIP fields' });
    }
    console.log(`GoIP Inbound: From ${src} to SIM ${dst}: ${msg}`);

    const profile = await prisma.profile.findFirst({ where: { phoneNumber: dst } });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found for this SIM' });
    }

    let chat = await prisma.chat.findUnique({ where: { externalId_profileId: { externalId: src, profileId: profile.id } } });
    if (!chat) {
      chat = await prisma.chat.create({ data: { externalId: src, profileId: profile.id, agencyId: profile.agencyId } });
    }

    const createdMessage = await prisma.message.create({ data: { chatId: chat.id, text: msg, transport: 'sms', direction: 'INBOUND', status: 'delivered' } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });

    try {
      const { getIO } = require('../services/socket');
      getIO().to(`agency_${profile.agencyId}`).emit('new_message', {
        id: Date.now(), profileId: profile.id, from: src, text: msg, transport: 'sms', type: 'sms',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered', direction: 'inbound'
      });
    } catch (e) { console.warn('Socket emit failed', e); }

    try {
      await sendChatPush({
        agencyId: profile.agencyId,
        profileId: profile.id,
        chatId: createdMessage.id,
        from: src,
        messagePreview: msg,
        profileName: profile.name
      });
    } catch (e) {
      console.warn('Push send failed for SMS', e.message);
    }

    res.status(200).send('RECEIVE OK');
  } catch (error) {
    console.error('GoIP Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Generic Mobile SMS Apps
exports.handleMobileSms = async (req, res) => {
  try {
    const { from, to, text, secret } = req.body;
    if (secret !== process.env.DEVICE_SECRET) {
      return res.status(401).json({ message: 'Unauthorized device' });
    }
    if (!from || typeof from !== 'string' || from.length > 64) {
      return res.status(400).json({ message: 'Invalid from field' });
    }
    if (!to || typeof to !== 'string' || to.length > 64) {
      return res.status(400).json({ message: 'Invalid to field' });
    }
    if (!text || typeof text !== 'string' || text.length > 4096) {
      return res.status(400).json({ message: 'Invalid text field' });
    }

    const profile = await prisma.profile.findFirst({ where: { phoneNumber: to } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    let chat = await prisma.chat.findUnique({ where: { externalId_profileId: { externalId: from, profileId: profile.id } } });
    if (!chat) {
      chat = await prisma.chat.create({ data: { externalId: from, profileId: profile.id, agencyId: profile.agencyId } });
    }

    const createdMessage = await prisma.message.create({ data: { chatId: chat.id, text, transport: 'sms', direction: 'INBOUND', status: 'delivered' } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });

    try {
      const { getIO } = require('../services/socket');
      getIO().to(`agency_${profile.agencyId}`).emit('new_message', {
        id: Date.now(), profileId: profile.id, from, text, transport: 'sms', type: 'sms',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered', direction: 'inbound'
      });
    } catch (e) { console.warn('Socket emit failed', e); }

    try {
      await sendChatPush({
        agencyId: profile.agencyId,
        profileId: profile.id,
        chatId: createdMessage.id,
        from,
        messagePreview: text,
        profileName: profile.name
      });
    } catch (e) {
      console.warn('Push send failed for mobile SMS', e.message);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Mobile Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Incoming Call Notification
exports.handleMobileCall = async (req, res) => {
  try {
    const { from, to, state, secret } = req.body;
    if (secret !== process.env.DEVICE_SECRET) {
      return res.status(401).json({ message: 'Unauthorized device' });
    }
    if (!from || typeof from !== 'string' || from.length > 64) {
      return res.status(400).json({ message: 'Invalid from field' });
    }
    if (!to || typeof to !== 'string' || to.length > 64) {
      return res.status(400).json({ message: 'Invalid to field' });
    }
    if (!state || typeof state !== 'string' || state.length > 32) {
      return res.status(400).json({ message: 'Invalid state field' });
    }

    const profile = await prisma.profile.findFirst({ where: { phoneNumber: to } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const callState = normalizeCallState(state);

    await prisma.callLog.create({
      data: {
        profileId: profile.id,
        from: from || 'UNKNOWN',
        status: callState
      }
    });

    try {
      const { getIO } = require('../services/socket');
      getIO().to(`agency_${profile.agencyId}`).emit('incoming_call', { from, profileName: profile.name, profileId: profile.id, state: callState });
    } catch (e) { console.warn('Socket emit failed for call', e); }

    try {
      await sendCallPush({
        agencyId: profile.agencyId,
        profileId: profile.id,
        from,
        caller: from,
        profileName: profile.name,
        callState
      });
    } catch (e) {
      console.warn('Push send failed for call', e.message);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Call Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
