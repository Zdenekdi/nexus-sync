const prisma = require('../services/db');

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

    await prisma.message.create({ data: { chatId: chat.id, text: msg, direction: 'INBOUND', status: 'delivered' } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });

    try {
      const { getIO } = require('../services/socket');
      getIO().to(`agency_${profile.agencyId}`).emit('new_message', {
        id: Date.now(), profileId: profile.id, from: src, text: msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered', direction: 'inbound'
      });
    } catch (e) { console.warn('Socket emit failed', e); }

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
    if (process.env.DEVICE_SECRET && secret !== process.env.DEVICE_SECRET) {
      return res.status(401).json({ message: 'Unauthorized device' });
    }
    if (!from || !to || !text) {
      return res.status(400).json({ message: 'Missing from, to, or text' });
    }

    const profile = await prisma.profile.findFirst({ where: { phoneNumber: to } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    let chat = await prisma.chat.findUnique({ where: { externalId_profileId: { externalId: from, profileId: profile.id } } });
    if (!chat) {
      chat = await prisma.chat.create({ data: { externalId: from, profileId: profile.id, agencyId: profile.agencyId } });
    }

    await prisma.message.create({ data: { chatId: chat.id, text, direction: 'INBOUND', status: 'delivered' } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });

    try {
      const { getIO } = require('../services/socket');
      getIO().to(`agency_${profile.agencyId}`).emit('new_message', {
        id: Date.now(), profileId: profile.id, from, text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered', direction: 'inbound'
      });
    } catch (e) { console.warn('Socket emit failed', e); }

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
    if (process.env.DEVICE_SECRET && secret !== process.env.DEVICE_SECRET) {
      return res.status(401).json({ message: 'Unauthorized device' });
    }
    if (!from || !to || !state) {
      return res.status(400).json({ message: 'Missing from, to, or state' });
    }

    const profile = await prisma.profile.findFirst({ where: { phoneNumber: to } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    try {
      const { getIO } = require('../services/socket');
      getIO().to(`agency_${profile.agencyId}`).emit('incoming_call', { from, profileName: profile.name, profileId: profile.id, state });
    } catch (e) { console.warn('Socket emit failed for call', e); }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Call Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
