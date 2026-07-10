const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isManagerRole } = require('../utils/authz');

router.use(authMiddleware);

const currentUserId = (user) => user?.userId || user?.id || user?.sub;

// GET /api/salon-keys  — list all keys for this agency (with holder info)
router.get('/', async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    if (!agencyId) return res.status(403).json({ error: 'No agency context' });

    const keys = await prisma.salonKey.findMany({
      where: { agencyId },
      include: {
        holder: { select: { id: true, name: true, email: true } }
      },
      orderBy: { label: 'asc' }
    });
    res.json(keys);
  } catch (err) {
    console.error("[SalonKey Security] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/salon-keys  — create a new key slot (Manager+)
router.post('/', async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { label } = req.body;
    if (!agencyId) return res.status(403).json({ error: 'No agency context' });
    if (!isManagerRole(req.user.role)) return res.status(403).json({ error: 'Manager role required' });
    const key = await prisma.salonKey.create({
      data: { agencyId, label: label || 'Klíče od salonu' }
    });
    res.status(201).json(key);
  } catch (err) {
    console.error("[SalonKey Security] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/salon-keys/:id/take  — take the key
router.post('/:id/take', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = currentUserId(req.user);
    const agencyId = req.user.agencyId;

    if (!userId) return res.status(403).json({ error: 'No user context' });

    const existing = await prisma.salonKey.findFirst({ where: { id, agencyId } });
    if (!existing) return res.status(404).json({ error: 'Key not found' });
    if (existing.holderId) return res.status(409).json({ error: 'Key already taken', holder: existing.holderId });

    const [key] = await prisma.$transaction([
      prisma.salonKey.update({
        where: { id },
        data: { holderId: userId, takenAt: new Date(), note: note || null },
        include: { holder: { select: { id: true, name: true, email: true } } }
      }),
      prisma.salonKeyLog.create({
        data: { keyId: id, action: 'TAKEN', userId, note: note || null }
      })
    ]);
    res.json(key);
  } catch (err) {
    console.error("[SalonKey Security] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/salon-keys/:id/return  — return the key
router.post('/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = currentUserId(req.user);
    const agencyId = req.user.agencyId;

    if (!userId) return res.status(403).json({ error: 'No user context' });

    const existing = await prisma.salonKey.findFirst({ where: { id, agencyId } });
    if (!existing) return res.status(404).json({ error: 'Key not found' });
    if (!existing.holderId) return res.status(409).json({ error: 'Key is already in place' });

    // Allow manager/admin to force-return, or holder themselves
    const isManager = isManagerRole(req.user.role);
    if (!isManager && existing.holderId !== userId) {
      return res.status(403).json({ error: 'Only the current holder or a manager can return the key' });
    }

    const [key] = await prisma.$transaction([
      prisma.salonKey.update({
        where: { id },
        data: { holderId: null, takenAt: null, note: null },
        include: { holder: { select: { id: true, name: true, email: true } } }
      }),
      prisma.salonKeyLog.create({
        data: { keyId: id, action: 'RETURNED', userId, note: note || null }
      })
    ]);
    res.json(key);
  } catch (err) {
    console.error("[SalonKey Security] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/salon-keys/:id/history  — log history for one key
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;

    const existing = await prisma.salonKey.findFirst({ where: { id, agencyId } });
    if (!existing) return res.status(404).json({ error: 'Key not found' });

    const logs = await prisma.salonKeyLog.findMany({
      where: { keyId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    console.error("[SalonKey Security] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/salon-keys/:id  — delete a key slot (Manager+)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    if (!isManagerRole(req.user.role)) return res.status(403).json({ error: 'Manager role required' });
    await prisma.salonKey.deleteMany({ where: { id, agencyId } });
    res.json({ ok: true });
  } catch (err) {
    console.error("[SalonKey Security] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
