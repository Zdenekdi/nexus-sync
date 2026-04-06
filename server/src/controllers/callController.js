const prisma = require('../services/db');
const logger = require('../services/logger');

class CallController {
  /**
   * POST /api/calls/log
   * Create a call log entry. Called by SIP controller or relay device.
   */
  async createLog(req, res) {
    try {
      const { profileId, from, duration, status } = req.body;
      if (!profileId || !from) {
        return res.status(400).json({ message: 'profileId and from are required' });
      }

      const log = await prisma.callLog.create({
        data: {
          profileId,
          from,
          duration: parseInt(duration) || 0,
          status: status || 'incoming'
        }
      });

      res.status(201).json(log);
    } catch (err) {
      logger.error('createLog error:', err);
      res.status(500).json({ message: 'Failed to create call log' });
    }
  }

  /**
   * PATCH /api/calls/log/:id
   * Update call log (duration, status) when call ends.
   */
  async updateLog(req, res) {
    try {
      const { id } = req.params;
      const { duration, status } = req.body;

      const log = await prisma.callLog.update({
        where: { id },
        data: {
          ...(duration !== undefined && { duration: parseInt(duration) }),
          ...(status && { status })
        }
      });

      res.json(log);
    } catch (err) {
      logger.error('updateLog error:', err);
      res.status(500).json({ message: 'Failed to update call log' });
    }
  }

  /**
   * GET /api/calls/logs?profileId=xxx&days=7&page=1
   * Fetch call logs for a profile.
   */
  async getLogs(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId } = req.query;
      const days = Math.min(90, parseInt(req.query.days) || 7);
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 30);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        profile: { agencyId },
        createdAt: { gte: startDate },
        ...(profileId && { profileId })
      };

      const [logs, total] = await Promise.all([
        prisma.callLog.findMany({
          where,
          include: { profile: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.callLog.count({ where })
      ]);

      res.json({ logs, total, page });
    } catch (err) {
      logger.error('getLogs error:', err);
      res.status(500).json({ message: 'Failed to fetch call logs' });
    }
  }

  /**
   * GET /api/calls/stats?profileId=xxx&days=7
   * Call statistics for a profile or entire agency.
   */
  async getStats(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId } = req.query;
      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        profile: { agencyId },
        createdAt: { gte: startDate },
        ...(profileId && { profileId })
      };

      const logs = await prisma.callLog.findMany({ where });

      const totalCalls = logs.length;
      const totalDuration = logs.reduce((s, l) => s + l.duration, 0);
      const completed = logs.filter(l => l.status === 'completed');
      const missed = logs.filter(l => l.status === 'missed');

      res.json({
        totalCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        completedCalls: completed.length,
        missedCalls: missed.length,
        completionRate: totalCalls > 0 ? parseFloat((completed.length / totalCalls * 100).toFixed(1)) : 0
      });
    } catch (err) {
      logger.error('getStats error:', err);
      res.status(500).json({ message: 'Failed to fetch call stats' });
    }
  }

  /**
   * GET /api/calls/operator-metrics?days=7
   * Per-profile call metrics for the agency.
   */
  async getOperatorMetrics(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const profiles = await prisma.profile.findMany({
        where: { agencyId },
        select: {
          id: true, name: true,
          callLogs: {
            where: { createdAt: { gte: startDate } },
            select: { duration: true, status: true }
          }
        }
      });

      const metrics = profiles.map(p => ({
        profileId: p.id,
        profileName: p.name,
        totalCalls: p.callLogs.length,
        completedCalls: p.callLogs.filter(l => l.status === 'completed').length,
        missedCalls: p.callLogs.filter(l => l.status === 'missed').length,
        totalDuration: p.callLogs.reduce((s, l) => s + l.duration, 0)
      })).sort((a, b) => b.totalCalls - a.totalCalls);

      res.json(metrics);
    } catch (err) {
      logger.error('getOperatorMetrics error:', err);
      res.status(500).json({ message: 'Failed to fetch operator metrics' });
    }
  }
}

module.exports = new CallController();
