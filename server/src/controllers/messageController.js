const prisma = require('../services/db');
const { getIO } = require('../services/socket');
const { sendChatPush, sendRelaySmsPush } = require('../services/pushService');

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { role, agencyId } = req.user;
    const isAppOwner = role?.isAppOwner;
    if (isAppOwner) return res.status(403).json({ message: 'App Owner cannot access messages' });
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });
    const messages = await prisma.message.findMany({
      where: { chatId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { chatId, text, direction, status, transport } = req.body;
    const { id: userId, role, agencyId } = req.user;
    const isAppOwner = role?.isAppOwner;
    if (isAppOwner) return res.status(403).json({ message: 'App Owner cannot access messages' });
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });
    
    // ── Pre-Save Relay: ensuring the message can be sent via relay before persisting ──
    if (direction === 'OUTBOUND') {
      const relayRes = await sendRelaySmsPush({
        agencyId: chat.agencyId,
        profileId: chat.profileId,
        to: chat.externalId,
        text: text
      });

      if (!relayRes.ok) {
        console.error('[Relay] Failed to trigger outbound push:', relayRes.message);
        return res.status(400).json({ 
          message: 'Failed to send message via relay device', 
          details: relayRes.message 
        });
      }
    }

    // Save message to DB only after successful relay (for OUTBOUND) or directly (for INBOUND)
    const message = await prisma.message.create({
      data: {
        chatId,
        text,
        direction,
        status: status || 'sent',
        senderId: direction === 'OUTBOUND' ? userId : null
      },
      include: { sender: { select: { id: true, name: true } } }
    });

    // Update chat timestamp
    await prisma.chat.update({ where: { id: chatId }, data: { lastMessageAt: new Date() } });

    try { 
      getIO().to(`agency_${chat.agencyId}`).emit('new_message', { 
        ...message,
        chatId: chatId,
        profileId: chat.profileId,
        from: chat.externalId
      }); 
    } catch (e) { /* Socket may not be ready */ }
    
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating message' });
  }
};

exports.simulateInbound = async (req, res) => {
  try {
    const { externalId, profileId, text } = req.body;
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    let chat = await prisma.chat.findUnique({ where: { externalId_profileId: { externalId, profileId } } });
    if (!chat) {
      chat = await prisma.chat.create({ data: { externalId, profileId, agencyId: profile.agencyId } });
    }
    const message = await prisma.message.create({ data: { chatId: chat.id, text, direction: 'INBOUND', transport: 'sms', status: 'received' } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });
    
    try { 
      getIO().to(`agency_${profile.agencyId}`).emit('new_message', { 
        ...message,
        chatId: chat.id,
        profileId: profile.id,
        from: externalId
      }); 
    } catch (e) { /* Socket may not be ready */ }
    
    try {
      await sendChatPush({
        agencyId: profile.agencyId,
        profileId,
        chatId: message.id,
        from: externalId,
        messagePreview: text,
        profileName: profile.name
      });
    } catch (e) { /* Push may be unavailable */ }
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error simulating inbound message' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { role, agencyId } = req.user;
    const isAppOwner = role?.isAppOwner;
    if (isAppOwner) return res.status(403).json({ message: 'App Owner cannot access messages' });
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { chat: true } });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.chat.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.message.update({ where: { id: messageId }, data: { status: 'read' } });
    try { getIO().to(`agency_${message.chat.agencyId}`).emit('message_updated', { chatId: message.chatId, message: updated }); } catch (e) { /* Socket may not be ready */ }
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking message as read' });
  }
};
