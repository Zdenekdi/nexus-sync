const cron = require('node-cron');
const prisma = require('./db');
const logger = require('./logger');

/**
 * Scheduled jobs for the Nexus Hub server.
 */
class CronService {
  start() {
    // Generate daily stats every day at 01:00
    cron.schedule('0 1 * * *', () => this.generateDailyStats());

    // Clean up expired subscriptions every day at 02:00
    cron.schedule('0 2 * * *', () => this.expireSubscriptions());

    logger.info('Cron service started (daily stats @ 01:00, subscription check @ 02:00)');
  }

  async generateDailyStats() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfDay = new Date(yesterday);
      endOfDay.setHours(23, 59, 59, 999);

      const agencies = await prisma.agency.findMany({ select: { id: true } });

      for (const agency of agencies) {
        const [bookingsCount, activeProfiles, revenue] = await Promise.all([
          prisma.booking.count({
            where: {
              agencyId: agency.id,
              startTime: { gte: yesterday, lte: endOfDay }
            }
          }),
          prisma.profile.count({
            where: { agencyId: agency.id, status: 'online' }
          }),
          // Revenue from subscriptions paid that day
          prisma.subscription.aggregate({
            where: {
              agencyId: agency.id,
              startedAt: { gte: yesterday, lte: endOfDay },
              amountPaid: { not: null }
            },
            _sum: { amountPaid: true }
          })
        ]);

        await prisma.dailyStat.upsert({
          where: {
            agencyId_date: { agencyId: agency.id, date: yesterday }
          },
          update: { bookingsCount, activeProfiles, revenue: revenue._sum.amountPaid || 0 },
          create: {
            agencyId: agency.id,
            date: yesterday,
            bookingsCount,
            activeProfiles,
            revenue: revenue._sum.amountPaid || 0
          }
        });
      }

      logger.info(`Daily stats generated for ${agencies.length} agencies (${yesterday.toISOString().slice(0, 10)})`);
    } catch (err) {
      logger.error('Failed to generate daily stats:', err);
    }
  }

  async expireSubscriptions() {
    try {
      const now = new Date();
      const result = await prisma.subscription.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: now }
        },
        data: { status: 'EXPIRED' }
      });

      if (result.count > 0) {
        logger.info(`Expired ${result.count} subscription(s)`);
      }
    } catch (err) {
      logger.error('Failed to expire subscriptions:', err);
    }
  }
}

module.exports = new CronService();
