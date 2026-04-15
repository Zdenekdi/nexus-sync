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

// --- AUTHENTICATED ENDPOINTS (RBAC) ---

exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = String(req.user?.userId || req.user?.id || '');
    const agencyId = req.user?.agencyId;

    if (!token || !userId || userId === '') {
      return res.status(400).json({ ok: false, message: 'Invalid token or user context.' });
    }

    const result = await registerPushToken({ userId, agencyId, token, platform: platform || 'android' });
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

    // RBAC: RESTRICTED for App Owner, Agency Admin, Manager
    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    if (!agencyId || !userId || userId === '') return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (!installationId) return res.status(400).json({ ok: false, message: 'Missing installationId' });

    let resolvedProfileId = null;
    if (profileId) {
      const profile = await prisma.profile.findFirst({ where: { id: String(profileId), agencyId: String(agencyId) } });
      if (!profile) return res.status(404).json({ ok: false, message: 'Profile not found' });
      resolvedProfileId = profile.id;
    }

    if (!resolvedProfileId) {
      const assignedProfile = await prisma.profile.findFirst({ where: { agencyId: String(agencyId), assignees: { some: { id: String(userId) } } } });
      if (assignedProfile) resolvedProfileId = assignedProfile.id;
    }

    if (!resolvedProfileId) return res.status(409).json({ ok: false, profileRequired: true });

    await prisma.deviceBinding.upsert({
      where: { installationId },
      update: { userId: String(userId), agencyId: String(agencyId), profileId: String(resolvedProfileId), platform: String(platform || 'android'), active: true, model, deviceName, lastSeenAt: new Date() },
      create: { installationId, userId: String(userId), agencyId: String(agencyId), profileId: String(resolvedProfileId), platform: String(platform || 'android'), active: true, model, deviceName, lastSeenAt: new Date() },
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
    const { installationId } = req.query;

    const roleName = (typeof userRole === 'string' ? userRole : userRole?.name) || '';
    const internalRole = roleName.toUpperCase();

    if (internalRole === 'APP OWNER' || internalRole === 'AGENCY ADMIN' || internalRole === 'MANAGER') {
      return res.status(403).json({ ok: false });
    }

    if (!installationId || !userId || userId === '') return res.status(400).json({ ok: false });

    const binding = await prisma.deviceBinding.findUnique({ where: { installationId }, select: { userId: true, active: true } });
    if (!binding) return res.status(404).json({ ok: true, registered: false });
    if (binding.userId !== userId) return res.status(403).json({ ok: false });

    return res.json({ ok: true, registered: true, active: Boolean(binding.active) });
  } catch (error) {
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
      return res.status(403).json({ ok: false });
    }

    if (!agencyId) return res.status(400).json({ ok: false });

    const isSenior = (internalRole === 'SENIOR OPERATOR');
    const bindings = await prisma.deviceBinding.findMany({
      where: isSenior ? { agencyId: String(agencyId) } : { userId: String(userId) },
      include: { profile: { select: { name: true } } },
      orderBy: { lastSeenAt: 'desc' }
    });

    return res.json({ ok: true, bindings });
  } catch (error) {
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
      return res.status(403).json({ ok: false });
    }

    const binding = await prisma.deviceBinding.findUnique({ where: { installationId } });
    if (!binding || binding.userId !== userId) return res.status(403).json({ ok: false });

    await prisma.deviceBinding.update({ where: { installationId }, data: { active: false } });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
};

exports.sendTestPush = async (req, res) => {
  try {
    const { title, body } = req.body;
    const userId = String(req.user?.userId || req.user?.id || '');
    const agencyId = req.user?.agencyId;

    if (!title || !body) return res.status(400).json({ ok: false });

    const binding = await prisma.deviceBinding.findFirst({ where: { userId, active: true } });
    if (!binding) return res.status(404).json({ ok: false, message: 'No active device binding' });

    await sendChatPush({ agencyId, profileId: binding.profileId, chatId: 'test', from: 'SYSTEM', messagePreview: body, profileName: 'Test' });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
};

// --- PUBLIC WEBHOOKS (SECRET BASED) ---

exports.handleRelay = async (req, res) => {
  try {
    const { installationId, type, transport, from, content, secret } = req.body;
    if (!from || !content) return res.status(400).json({ ok: false, message: 'Missing from or content' });
    
    const messageTransport = normalizeTransport(transport || type);
    if (!messageTransport) return res.status(400).json({ ok: false, message: 'Invalid transport' });

    let isAuthorized = (secret === process.env.DEVICE_SECRET);
    const binding = await prisma.deviceBinding.findUnique({ where: { installationId: installationId || 'none' }, include: { profile: { select: { id: true, name: true, agencyId: true } } } });

    if (binding && binding.active) isAuthorized = true;
    if (!isAuthorized) return res.status(401).json({ message: 'Unauthorized' });
    if (!binding) return res.status(404).json({ ok: false, message: 'Source device not found' });

    if (binding && (messageTransport === 'sms' || messageTransport === 'rcs')) {
      const direction = (type === 'SMS_SENT' || type === 'OUTBOUND') ? 'OUTBOUND' : 'INBOUND';
      let chat = await prisma.chat.findFirst({ where: { externalId: from, profileId: binding.profileId } });
      if (!chat) chat = await prisma.chat.create({ data: { externalId: from, profileId: binding.profileId, agencyId: binding.agencyId } });
      
      const createdMessage = await prisma.message.create({ data: { chatId: chat.id, text: content, transport: messageTransport, direction, status: 'delivered', createdAt: new Date() } });
      await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });
      getIO().to(`agency_${binding.agencyId}`).emit('new_message', { id: createdMessage.id, profileId: binding.profileId, chatId: chat.id, from, text: content, transport: messageTransport, direction: direction.toLowerCase() });
      
      try { await sendChatPush({ agencyId: binding.agencyId, profileId: binding.profileId, chatId: chat.id, from, messagePreview: content, profileName: binding.profile.name }); } catch { /* skip */ }
    } else if (binding && messageTransport === 'call') {
      const callState = normalizeCallState(content);
      await prisma.callLog.create({ data: { profileId: binding.profileId, from: from || 'UNKNOWN', status: callState } });
      getIO().to(`agency_${binding.agencyId}`).emit('incoming_call', { profileId: binding.profileId, from, profileName: binding.profile.name, state: callState });
      try { await sendCallPush({ agencyId: binding.agencyId, profileId: binding.profileId, from, caller: from, profileName: binding.profile.name, callState }); } catch { /* skip */ }
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
};

exports.handleGoIP = async (req, res) => {
  try {
    const { src, dst, msg } = req.body;
    if (!src || !dst || !msg) return res.status(400).send('BAD FIELDS');
    const profile = await prisma.profile.findFirst({ where: { phoneNumber: dst } });
    if (!profile) return res.status(404).send('NOT FOUND');

    let chat = await prisma.chat.findUnique({ where: { externalId_profileId: { externalId: src, profileId: profile.id } } });
    if (!chat) chat = await prisma.chat.create({ data: { externalId: src, profileId: profile.id, agencyId: profile.agencyId } });
    await prisma.message.create({ data: { chatId: chat.id, text: msg, transport: 'sms', direction: 'INBOUND', status: 'delivered' } });
    getIO().to(`agency_${profile.agencyId}`).emit('new_message', { id: Date.now(), from: src, text: msg, transport: 'sms' });
    return res.status(200).send('RECEIVE OK');
  } catch (error) {
    return res.status(500).send('ERROR');
  }
};

exports.handleMobileSms = async (req, res) => {
  try {
    const { from, to, text, secret } = req.body;
    if (!from || !to || !text) return res.status(400).json({ ok: false, message: 'Missing fields' });
    if (secret !== process.env.DEVICE_SECRET) return res.status(401).json({ message: 'Unauthorized' });
    const profile = await prisma.profile.findFirst({ where: { phoneNumber: to } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    let chat = await prisma.chat.findFirst({ where: { externalId: from, profileId: profile.id } });
    if (!chat) chat = await prisma.chat.create({ data: { externalId: from, profileId: profile.id, agencyId: profile.agencyId } });
    await prisma.message.create({ data: { chatId: chat.id, text, transport: 'sms', direction: 'INBOUND', status: 'delivered' } });
    getIO().to(`agency_${profile.agencyId}`).emit('new_message', { from, text, transport: 'sms' });
    return res.json({ status: 'success' });
  } catch (error) {
    return res.status(500).json({ message: 'Error' });
  }
};

exports.handleMobileCall = async (req, res) => {
  try {
    const { from, to, state, secret } = req.body;
    if (!from || !to || !state) return res.status(400).json({ ok: false, message: 'Missing fields' });
    if (secret !== process.env.DEVICE_SECRET) return res.status(401).json({ message: 'Unauthorized' });
    const profile = await prisma.profile.findFirst({ where: { phoneNumber: to } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const callState = normalizeCallState(state);
    await prisma.callLog.create({ data: { profileId: profile.id, from: from || 'UNKNOWN', status: callState } });
    getIO().to(`agency_${profile.agencyId}`).emit('incoming_call', { from, profileName: profile.name, profileId: profile.id, state: callState });
    return res.json({ status: 'success' });
  } catch (error) {
    return res.status(500).json({ message: 'Error' });
  }
};
