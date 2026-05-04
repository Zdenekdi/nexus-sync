const prisma = require('../services/db');
const logger = require('../services/logger');

class AnalyticsController {
  /**
   * GET /api/analytics/daily
   * Returns daily stats for the last N days (default 30).
   */
  async getDailyStats(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const days = Math.min(parseInt(req.query.days) || 30, 90);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const stats = await prisma.dailyStat.findMany({
        where: { agencyId, date: { gte: startDate } },
        orderBy: { date: 'asc' }
      });

      res.json(stats);
    } catch (err) {
      logger.error('getDailyStats error:', err);
      res.status(500).json({ message: 'Failed to fetch daily stats' });
    }
  }

  /**
   * GET /api/analytics/summary
   * Aggregated summary: total revenue, bookings, active profiles for current period.
   */
  async getSummary(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await prisma.dailyStat.findMany({
        where: { agencyId, date: { gte: startDate } }
      });

      const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
      const totalBookings = stats.reduce((sum, s) => sum + s.bookingsCount, 0);
      const avgProfiles = stats.length > 0
        ? Math.round(stats.reduce((sum, s) => sum + s.activeProfiles, 0) / stats.length)
        : 0;

      // Previous period for comparison
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - days);
      const prevStats = await prisma.dailyStat.findMany({
        where: { agencyId, date: { gte: prevStart, lt: startDate } }
      });
      const prevRevenue = prevStats.reduce((sum, s) => sum + s.revenue, 0);
      const prevBookings = prevStats.reduce((sum, s) => sum + s.bookingsCount, 0);

      res.json({
        revenue: totalRevenue,
        bookings: totalBookings,
        activeProfiles: avgProfiles,
        revenueChange: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0,
        bookingsChange: prevBookings > 0 ? ((totalBookings - prevBookings) / prevBookings * 100).toFixed(1) : 0,
        chartData: stats.map(s => ({ date: s.date, revenue: s.revenue, bookings: s.bookingsCount }))
      });
    } catch (err) {
      logger.error('getSummary error:', err);
      res.status(500).json({ message: 'Failed to fetch summary' });
    }
  }

  /**
   * POST /api/analytics/generate (called by cron or manually)
   * Generates DailyStat for yesterday (or a specific date).
   */
  async generateDaily(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const targetDate = req.body.date ? new Date(req.body.date) : new Date();
      targetDate.setDate(targetDate.getDate() - (req.body.date ? 0 : 1));
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const bookingsCount = await prisma.booking.count({
        where: { agencyId, createdAt: { gte: targetDate, lt: nextDay } }
      });

      const activeProfiles = await prisma.profile.count({
        where: { agencyId, status: { not: 'deleted' } }
      });

      // Sum revenue from completed bookings
      const bookings = await prisma.booking.findMany({
        where: { agencyId, createdAt: { gte: targetDate, lt: nextDay } },
        select: { price: true }
      });
      const revenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

      const stat = await prisma.dailyStat.upsert({
        where: { agencyId_date: { agencyId, date: targetDate } },
        create: { agencyId, date: targetDate, revenue, bookingsCount, activeProfiles },
        update: { revenue, bookingsCount, activeProfiles }
      });

      res.json(stat);
    } catch (err) {
      logger.error('generateDaily error:', err);
      res.status(500).json({ message: 'Failed to generate daily stats' });
    }
  }
}

module.exports = new AnalyticsController();
