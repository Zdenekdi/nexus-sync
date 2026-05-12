const express = require('express');
const router = express.Router();
const prisma = require('../../../services/db');
const { apiKeyAuth, requireScope } = require('../../../middleware/apiKeyMiddleware');
const rateLimit = require('express-rate-limit');

// Public API Rate Limiting: 60 requests per minute per API key
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { message: 'Rate limit exceeded. Public API is limited to 60 requests per minute.' }
});

// Apply API Key Auth and Rate Limiting to all routes in this router
router.use(apiKeyAuth);
router.use(publicApiLimiter);

/**
 * GET /api/v1/public/stats
 * Returns high-level agency metrics.
 */
router.get('/stats', requireScope('read:stats'), async (req, res) => {
  try {
    const { id: agencyId } = req.agency;

    const [totalMessages, totalBookings, totalProfiles] = await Promise.all([
      prisma.message.count({ where: { chat: { agencyId } } }),
      prisma.safetySession.count({ where: { agencyId } }),
      prisma.profile.count({ where: { agencyId } })
    ]);

    res.json({
      agencyId,
      timestamp: new Date().toISOString(),
      metrics: {
        totalMessages,
        totalBookings,
        totalProfiles,
        revenue: "0.00" // Placeholder for now
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch public stats' });
  }
});

/**
 * GET /api/v1/public/profiles
 * Returns a list of active profiles for the agency.
 */
router.get('/profiles', requireScope('read:profiles'), async (req, res) => {
  try {
    const { id: agencyId } = req.agency;

    const profiles = await prisma.profile.findMany({
      where: { agencyId, status: 'active' },
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        createdAt: true
      }
    });

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch public profiles' });
  }
});

/**
 * GET /api/v1/public/messages
 * Returns latest messages (paged).
 */
router.get('/messages', requireScope('read:messages'), async (req, res) => {
  try {
    const { id: agencyId } = req.agency;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await prisma.message.findMany({
      where: { chat: { agencyId } },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        chat: {
          select: { profile: { select: { name: true } } }
        }
      }
    });

    res.json(messages.map(m => ({
      id: m.id,
      text: m.text,
      sender: m.senderType,
      profileName: m.chat?.profile?.name,
      createdAt: m.createdAt
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch public messages' });
  }
});

module.exports = router;
