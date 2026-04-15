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
    const { token, platform } = req.body;
    const userId = String(req.user?.userId || req.user?.id || '');
    const agencyId = req.user?.agencyId;

    if (!token || !userId || userId === '') {
      return res.status(400).json({ ok: false, message: 'Invalid token or user context.' });
    }

    const result = await registerPushToken({
      userId,
      agencyId,
      token,
      platform: platform || 'android'
    });

    return res.json({ ok: result.ok });
  } catch (error) {
    console.error('[Device] Register push error:', error);
    return res.status(500).json({ ok: false });
  }
};

exports.verifyDeviceBinding = async (req, res) => {
  try {
    const userId = String(req.user?.userId || req.user?.id || '');
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    
    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();
    const { installationId, profileId, platform, model, deviceName } = req.body;

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ ok: false, message: 'Forbidden: High-level management and Infrastructure roles do not access Device Setup.' });
    }

    if (!agencyId || !userId || userId === '') {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    if (!installationId) {
      return res.status(400).json({ ok: false, message: 'Missing installationId' });
    }

    let resolvedProfileId = null;
    if (profileId) {
      const profile = await prisma.profile.findFirst({ where: { id: profileId, agencyId } });
      if (!profile) return res.status(404).json({ ok: false, message: 'Profile not found' });
      resolvedProfileId = profile.id;
    }

    if (!resolvedProfileId) {
      const assignedProfile = await prisma.profile.findFirst({
        where: { agencyId, assignees: { some: { id: userId } } }
      });
      if (assignedProfile) resolvedProfileId = assignedProfile.id;
    }

    if (!resolvedProfileId) {
      return res.status(409).json({ ok: false, profileRequired: true, message: 'No profile assigned context.' });
    }

    const activeCount = await prisma.deviceBinding.count({ where: { userId, active: true, installationId: { not: installationId } } });
    if (activeCount >= 2) return res.status(403).json({ ok: false, message: 'Device limit reached' });

    await prisma.deviceBinding.upsert({
      where: { installationId },
      update: {
        userId, agencyId, profileId: resolvedProfileId,
        platform: String(platform || 'android'), active: true, model, deviceName, lastSeenAt: new Date(),
      },
      create: {
        installationId, userId, agencyId, profileId: resolvedProfileId,
        platform: String(platform || 'android'), active: true, model, deviceName, lastSeenAt: new Date(),
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Device] Verify error:', error);
    return res.status(500).json({ ok: false });
  }
};

exports.getRelayStatus = async (req, res) => {
  try {
    const userId = String(req.user?.userId || req.user?.id || '');
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    const { installationId } = req.query;

    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    if (!installationId || !userId || userId === '') return res.status(400).json({ ok: false });

    const binding = await prisma.deviceBinding.findUnique({ where: { installationId }, select: { userId: true, active: true } });
    if (!binding) return res.status(404).json({ ok: true, registered: false });
    if (binding.userId !== userId) return res.status(403).json({ ok: false });

    return res.json({ ok: true, registered: true, active: Boolean(binding.active) });
  } catch (error) {
    console.error('[Device] Relay status error:', error);
    return res.status(500).json({ ok: false });
  }
};

exports.getDeviceBindings = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const agencyId = req.user?.agencyId;
    const userId = String(req.user?.userId || req.user?.id || '');

    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ ok: false, message: 'Access denied' });
    }

    if (!agencyId) return res.status(400).json({ ok: false });

    // Restrict regular operators to only see their own bindings, Senior Operators can see agency-wide
    const isSenior = (internalRole === 'SENIOR OPERATOR');
    const bindings = await prisma.deviceBinding.findMany({
      where: isSenior ? { agencyId } : { userId },
      include: { profile: { select: { name: true } } },
      orderBy: { lastSeenAt: 'desc' }
    });

    return res.json({ ok: true, bindings });
  } catch (error) {
    console.error('[Device] Get bindings error:', error);
    return res.status(500).json({ ok: false });
  }
};

exports.revokeDeviceBinding = async (req, res) => {
  try {
    const userId = String(req.user?.userId || req.user?.id || '');
    const userRole = req.user?.role;
    const { installationId } = req.body;

    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    if (roleName.toUpperCase() === 'APP OWNER' || roleName.toUpperCase() === 'AGENCY ADMIN' || roleName.toUpperCase() === 'MANAGER') {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const binding = await prisma.deviceBinding.findUnique({ where: { installationId } });
    if (!binding || binding.userId !== userId) return res.status(403).json({ ok: false });

    await prisma.deviceBinding.update({ where: { installationId }, data: { active: false } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('[Device] Revoke error:', error);
    return res.status(500).json({ ok: false });
  }
};

exports.handleRelay = async (req, res) => {
  try {
    const { installationId, type, transport, from, content, secret } = req.body;
    const messageTransport = normalizeTransport(transport || type);
    let isAuthorized = (secret === process.env.DEVICE_SECRET);
    const binding = await prisma.deviceBinding.findUnique({ where: { installationId: installationId || 'none' } });

    if (binding && binding.active) isAuthorized = true;
    if (!isAuthorized) return res.status(401).json({ message: 'Unauthorized' });

    if (binding && (messageTransport === 'sms' || messageTransport === 'rcs')) {
      const direction = (type === 'SMS_SENT' || type === 'OUTBOUND') ? 'OUTBOUND' : 'INBOUND';
      let chat = await prisma.chat.findUnique({ where: { externalId_profileId: { externalId: from, profileId: binding.profileId } } });
      if (!chat) chat = await prisma.chat.create({ data: { externalId: from, profileId: binding.profileId, agencyId: binding.agencyId } });
      
      const createdMessage = await prisma.message.create({ data: { chatId: chat.id, text: content, transport: messageTransport, direction, status: 'delivered', createdAt: new Date() } });
      await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });
      getIO().to(`agency_${binding.agencyId}`).emit('new_message', { id: createdMessage.id, profileId: binding.profileId, chatId: chat.id, from, text: content, transport: messageTransport, direction: direction.toLowerCase() });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
};
