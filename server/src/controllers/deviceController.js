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

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Mobile Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
