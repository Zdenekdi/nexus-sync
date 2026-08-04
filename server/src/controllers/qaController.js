const prisma = require('../services/db');
const logger = require('../services/logger');
const { isManagerRole } = require('../utils/authz');

class QaController {
  /**
   * POST /api/qa/reviews — hodnocení konkrétní zprávy operátorky.
   *
   * Tohle je kontrola lidí, ne kontrola profilu (to je QaRecord). Proto
   * jen manažerské role: kdyby si operátorky mohly číst hodnocení navzájem,
   * je to něco úplně jiného než nástroj pro vedoucí.
   */
  async createReview(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      const reviewerId = req.user?.userId || req.user?.id;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });
      if (!isManagerRole(req.user?.role)) {
        return res.status(403).json({ message: 'Kontrolu komunikace smí zapisovat jen vedoucí role.' });
      }

      const { messageId, rating, note } = req.body;
      if (!messageId || !rating) {
        return res.status(400).json({ message: 'messageId and rating are required' });
      }

      // Zpráva musí patřit téže agentuře — jinak by šlo hodnotit cizí provoz.
      const message = await prisma.message.findUnique({
        where: { id: String(messageId) },
        include: { chat: { select: { agencyId: true } } }
      });
      if (!message || message.chat?.agencyId !== agencyId) {
        return res.status(404).json({ message: 'Zpráva nenalezena v této agentuře' });
      }

      const review = await prisma.qaReview.create({
        data: {
          agencyId,
          messageId: message.id,
          // Kdo zprávu napsal. U příchozí zprávy zůstane prázdné.
          operatorId: message.senderId || null,
          reviewerId: String(reviewerId),
          rating: Math.min(5, Math.max(1, parseInt(rating))),
          note: note || null
        }
      });

      return res.status(201).json(review);
    } catch (error) {
      logger.error('[QA] createReview failed:', error);
      return res.status(500).json({ message: 'Nepodařilo se uložit hodnocení' });
    }
  }

  /**
   * GET /api/qa/reviews — hodnocení komunikace v agentuře.
   *
   * Volitelně ?operatorId= pro jednu osobu. Text zprávy se dotahuje z Message
   * přes relaci; v QaReview uložený není.
   */
  async getReviews(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });
      if (!isManagerRole(req.user?.role)) {
        return res.status(403).json({ message: 'Kontrola komunikace je přístupná jen vedoucím rolím.' });
      }

      const { operatorId } = req.query;
      const reviews = await prisma.qaReview.findMany({
        where: {
          agencyId,
          ...(operatorId ? { operatorId: String(operatorId) } : {})
        },
        include: {
          message: { select: { id: true, text: true, direction: true, createdAt: true, chatId: true } },
          operator: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      });

      return res.json(reviews);
    } catch (error) {
      logger.error('[QA] getReviews failed:', error);
      return res.status(500).json({ message: 'Nepodařilo se načíst hodnocení' });
    }
  }

  /**
   * POST /api/qa/records
   * Create a QA record (rating + comment) for a profile.
   */
  async createRecord(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId, rating, comment, category } = req.body;
      if (!profileId || !rating) {
        return res.status(400).json({ message: 'profileId and rating are required' });
      }

      // Verify profile belongs to agency
      const profile = await prisma.profile.findUnique({ where: { id: profileId } });
      if (!profile || profile.agencyId !== agencyId) {
        return res.status(403).json({ message: 'Profile not found in your agency' });
      }

      const record = await prisma.qaRecord.create({
        data: {
          profileId,
          rating: Math.min(5, Math.max(1, parseInt(rating))),
          comment: comment || null,
          category: category || null
        }
      });

      res.status(201).json(record);
    } catch (err) {
      logger.error('createRecord error:', err);
      res.status(500).json({ message: 'Failed to create QA record' });
    }
  }

  /**
   * GET /api/qa/records?profileId=xxx&page=1&limit=20
   * List QA records for a profile.
   */
  async getRecords(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId } = req.query;
      if (!profileId) return res.status(400).json({ message: 'profileId required' });

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 20);

      const [records, total] = await Promise.all([
        prisma.qaRecord.findMany({
          where: { profileId, profile: { agencyId } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.qaRecord.count({
          where: { profileId, profile: { agencyId } }
        })
      ]);

      res.json({ records, total, page });
    } catch (err) {
      logger.error('getRecords error:', err);
      res.status(500).json({ message: 'Failed to fetch QA records' });
    }
  }

  /**
   * GET /api/qa/stats?profileId=xxx
   * Aggregate rating stats for a profile.
   */
  async getStats(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId } = req.query;
      if (!profileId) return res.status(400).json({ message: 'profileId required' });

      const records = await prisma.qaRecord.findMany({
        where: { profileId, profile: { agencyId } }
      });

      const totalReviews = records.length;
      const avgRating = totalReviews > 0
        ? parseFloat((records.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1))
        : 0;

      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      records.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

      const categories = {};
      records.filter(r => r.category).forEach(r => {
        categories[r.category] = (categories[r.category] || 0) + 1;
      });

      res.json({ averageRating: avgRating, totalReviews, distribution, categories });
    } catch (err) {
      logger.error('getStats error:', err);
      res.status(500).json({ message: 'Failed to fetch QA stats' });
    }
  }

  /**
   * PUT /api/qa/records/:id
   * Update a QA record.
   */
  async updateRecord(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });
      const { id } = req.params;
      const { rating, comment, category } = req.body;

      // Scope to caller's agency — prevents cross-agency IDOR
      const existing = await prisma.qaRecord.findFirst({
        where: { id, profile: { agencyId } },
        select: { id: true }
      });
      if (!existing) return res.status(404).json({ message: 'QA record not found' });

      const record = await prisma.qaRecord.update({
        where: { id },
        data: {
          ...(rating && { rating: Math.min(5, Math.max(1, parseInt(rating))) }),
          ...(comment !== undefined && { comment }),
          ...(category !== undefined && { category })
        }
      });

      res.json(record);
    } catch (err) {
      logger.error('updateRecord error:', err);
      res.status(500).json({ message: 'Failed to update QA record' });
    }
  }

  /**
   * DELETE /api/qa/records/:id
   */
  async deleteRecord(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });
      const result = await prisma.qaRecord.deleteMany({
        where: { id: req.params.id, profile: { agencyId } }
      });
      if (result.count === 0) return res.status(404).json({ message: 'QA record not found' });
      res.json({ ok: true });
    } catch (err) {
      logger.error('deleteRecord error:', err);
      res.status(500).json({ message: 'Failed to delete QA record' });
    }
  }

  /**
   * GET /api/qa/leaderboard
   * Top-rated profiles in the agency.
   */
  async getLeaderboard(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const profiles = await prisma.profile.findMany({
        where: { agencyId },
        select: {
          id: true, name: true,
          qaRecords: { select: { rating: true, createdAt: true } }
        }
      });

      // Recency-weighted scoring: recent reviews count more
      const now = Date.now();
      const DAY_MS = 86400000;
      const decayFactor = (date) => {
        const ageInDays = (now - new Date(date).getTime()) / DAY_MS;
        return Math.exp(-ageInDays / 90); // half-life ~62 days
      };

      const leaderboard = profiles
        .map(p => {
          if (p.qaRecords.length === 0) return null;
          const weightedSum = p.qaRecords.reduce((s, r) => s + r.rating * decayFactor(r.createdAt), 0);
          const weightTotal = p.qaRecords.reduce((s, r) => s + decayFactor(r.createdAt), 0);
          return {
            profileId: p.id,
            name: p.name,
            avgRating: parseFloat((weightedSum / weightTotal).toFixed(1)),
            totalReviews: p.qaRecords.length
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.avgRating - a.avgRating || b.totalReviews - a.totalReviews);

      res.json(leaderboard);
    } catch (err) {
      logger.error('getLeaderboard error:', err);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  }
}

module.exports = new QaController();
