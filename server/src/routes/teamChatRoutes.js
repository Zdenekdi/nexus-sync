const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const authMiddleware = require('../middleware/authMiddleware');

let io;
try { io = require('../services/socket').getIO(); } catch (_) {}

router.use(authMiddleware);

// Room access rules
function canAccessRoom(user, room) {
  const role = user.role || {};
  if (room === 'general') return true;
  if (room === 'managers') return role.isManager || role.isAdmin || role.isAppOwner;
  if (room === 'models') return !role.isAdmin && !role.isAppOwner; // ops + models, not pure admin
  return false;
}

// GET /api/team-chat/messages?room=general&before=<cursor_id>&limit=40
router.get('/messages', async (req, res) => {
  try {
    const { room = 'general', before, limit = '40' } = req.query;
    const agencyId = req.user.agencyId;
    if (!agencyId) return res.status(403).json({ error: 'No agency context' });
    if (!canAccessRoom(req.user, room)) return res.status(403).json({ error: 'Access denied to this room' });

    const take = Math.min(parseInt(limit) || 40, 100);
    const where = {
      agencyId,
      room,
      deletedAt: null,
      ...(before ? { createdAt: { lt: new Date(before) } } : {})
    };

    const messages = await prisma.teamMessage.findMany({
      where,
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take
    });

    res.json(messages.reverse()); // chronological order
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team-chat/messages — send a message
router.post('/messages', async (req, res) => {
  try {
    const { room = 'general', text } = req.body;
    const agencyId = req.user.agencyId;
    const authorId = req.user.id;

    if (!agencyId) return res.status(403).json({ error: 'No agency context' });
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });
    if (!canAccessRoom(req.user, room)) return res.status(403).json({ error: 'Access denied to this room' });

    const msg = await prisma.teamMessage.create({
      data: { agencyId, authorId, room, text: text.trim() },
      include: { author: { select: { id: true, name: true, email: true } } }
    });

    // Broadcast via Socket.io to all agency members in that room
    try {
      if (!io) io = require('../services/socket').getIO();
      io.to(`agency_${agencyId}`).emit('team_chat_message', { room, message: msg });
    } catch (_) {}

    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team-chat/messages/:id — soft delete own message
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const agencyId = req.user.agencyId;
    const isManager = req.user.role?.isManager || req.user.role?.isAdmin || req.user.role?.isAppOwner;

    const msg = await prisma.teamMessage.findFirst({ where: { id, agencyId, deletedAt: null } });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (!isManager && msg.authorId !== userId) return res.status(403).json({ error: 'Cannot delete others messages' });

    await prisma.teamMessage.update({ where: { id }, data: { deletedAt: new Date() } });

    try {
      if (!io) io = require('../services/socket').getIO();
      io.to(`agency_${agencyId}`).emit('team_chat_delete', { room: msg.room, messageId: id });
    } catch (_) {}

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team-chat/unread — count of messages since last seen timestamp
router.get('/unread', async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { since } = req.query;
    if (!agencyId || !since) return res.json({ count: 0 });

    const count = await prisma.teamMessage.count({
      where: {
        agencyId,
        room: 'general',
        createdAt: { gt: new Date(since) },
        deletedAt: null,
        authorId: { not: req.user.id }
      }
    });
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

module.exports = router;
