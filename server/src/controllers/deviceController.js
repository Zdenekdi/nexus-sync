const prisma = require('../services/db');

// GoIP sends data as application/x-www-form-urlencoded
// Expected fields: src (sender), dst (receiver/SIM), msg (text), time
exports.handleGoIP = async (req, res) => {
  try {
    const { src, dst, msg } = req.body;
    console.log(`GoIP Request received - src: "${src}", dst: "${dst}", msg: "${msg}"`);
    
    if (!src || !dst || !msg) {
      return res.status(400).json({ message: 'Missing required GoIP fields' });
    }

    console.log(`GoIP Inbound: From ${src} to SIM ${dst}: ${msg}`);

    // 1. Find profile by phone number (dst)
    const profile = await prisma.profile.findFirst({
      where: { phoneNumber: dst }
    });

    if (!profile) {
      console.warn(`No profile found for phone number: ${dst}`);
      return res.status(404).json({ message: 'Profile not found for this SIM' });
    }

    // 2. Find or Create Chat
    // externalId is the sender (src)
    let chat = await prisma.chat.findUnique({
      where: {
        externalId_profileId: {
          externalId: src,
          profileId: profile.id
        }
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          externalId: src,
          profileId: profile.id,
          agencyId: profile.agencyId
        }
      });
    }

    // 3. Create Message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        text: msg,
        direction: 'INBOUND',
        status: 'delivered'
      }
    });

    // 4. Update Chat lastMessageAt
    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() }
    });

    // 5. Emit real-time socket event to frontend
    try {
      const { getIO } = require('../services/socket');
      const io = getIO();
      // Emitting the message object that the frontend expects
      io.emit('new_message', {
        id: Date.now(),
        profileId: profile.id,
        from: src,
        text: msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
        direction: 'inbound'
      });
      console.log(`Socket.io emitted 'new_message' from ${src}`);
    } catch (e) {
      console.warn('Socket.io not available or failed to emit', e);
    }

    res.status(200).send('RECEIVE OK'); // GoIP expects this response
  } catch (error) {
    console.error('GoIP Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Generic Mobile SMS (Generic Android Apps)
// Expected JSON: { "from": "+420...", "to": "+420...", "text": "..." }
exports.handleMobileSms = async (req, res) => {
  try {
    const { from, to, text, secret } = req.body;
    
    // Simple security check (could be improved)
    if (process.env.DEVICE_SECRET && secret !== process.env.DEVICE_SECRET) {
      return res.status(401).json({ message: 'Unauthorized device' });
    }

    if (!from || !to || !text) {
      return res.status(400).json({ message: 'Missing from, to, or text' });
    }

    const profile = await prisma.profile.findFirst({
      where: { phoneNumber: to }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    let chat = await prisma.chat.findUnique({
      where: {
        externalId_profileId: {
          externalId: from,
          profileId: profile.id
        }
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          externalId: from,
          profileId: profile.id,
          agencyId: profile.agencyId
        }
      });
    }

    await prisma.message.create({
      data: {
        chatId: chat.id,
        text,
        direction: 'INBOUND',
        status: 'delivered'
      }
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() }
    });

    // 5. Emit real-time socket event to frontend
    try {
      const { getIO } = require('../services/socket');
      const io = getIO();
      // Emitting the message object that the frontend expects
      io.emit('new_message', {
        id: Date.now(),
        profileId: profile.id,
        from,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
        direction: 'inbound'
      });
      console.log(`Socket.io emitted 'new_message' from ${from}`);
    } catch (e) {
      console.warn('Socket.io not available or failed to emit', e);
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Mobile Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Handle Incoming Call Notification
// Expected JSON: { "from": "+420...", "to": "+420...", "state": "RINGING", "secret": "..." }
exports.handleMobileCall = async (req, res) => {
  try {
    const { from, to, state, secret } = req.body;

    if (process.env.DEVICE_SECRET && secret !== process.env.DEVICE_SECRET) {
      return res.status(401).json({ message: 'Unauthorized device' });
    }

    if (!from || !to || !state) {
      return res.status(400).json({ message: 'Missing from, to, or state' });
    }

    const profile = await prisma.profile.findFirst({
      where: { phoneNumber: to }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    console.log(`Incoming call notification: From ${from} to profile ${profile.name} (State: ${state})`);

    // In a real app, we would emit a socket event here to show a popup in the UI
    const { getIO } = require('../services/socket');
    try {
      const io = getIO();
      io.emit('incoming_call', {
        from,
        profileName: profile.name,
        profileId: profile.id,
        state
      });
    } catch (e) {
      console.warn('Socket.io not available for call notification');
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Call Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
