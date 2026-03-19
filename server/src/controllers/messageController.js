const prisma = require('../services/db');
const { getIO } = require('../services/socket');
const { sendChatPush } = require('../services/pushService');

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isSuperAdmin, agencyId } = req.user;
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!isSuperAdmin && chat.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });
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
    const { chatId, text, direction, status } = req.body;
    const { id: userId, isSuperAdmin, agencyId } = req.user;
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!isSuperAdmin && chat.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });
    const message = await prisma.message.create({
      data: { chatId, text, direction, status: status || 'sent', senderId: direction === 'OUTBOUND' ? userId : null },
      include: { sender: { select: { id: true, name: true } } }
    });
    await prisma.chat.update({ where: { id: chatId }, data: { lastMessageAt: new Date() } });
    try { getIO().to(`agency_${agencyId}`).emit('new_message', { chatId, message }); } catch (e) { /* Socket may not be ready */ }
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
    const message = await prisma.message.create({ data: { chatId: chat.id, text, direction: 'INBOUND', status: 'received' } });
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageAt: new Date() } });
    try { getIO().to(`agency_${profile.agencyId}`).emit('new_message', { chatId: chat.id, message }); } catch (e) { /* Socket may not be ready */ }
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
    const { isSuperAdmin, agencyId } = req.user;
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { chat: true } });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (!isSuperAdmin && message.chat.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });
    const updated = await prisma.message.update({ where: { id: messageId }, data: { status: 'read' } });
    try { getIO().to(`agency_${message.chat.agencyId}`).emit('message_updated', { chatId: message.chatId, message: updated }); } catch (e) { /* Socket may not be ready */ }
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking message as read' });
  }
};
