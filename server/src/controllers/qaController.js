const prisma = require('../services/db');
const logger = require('../services/logger');

class QaController {
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
      const { id } = req.params;
      const { rating, comment, category } = req.body;

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
      await prisma.qaRecord.delete({ where: { id: req.params.id } });
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
