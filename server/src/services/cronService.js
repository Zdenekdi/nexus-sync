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

    // AdultWork Organic Boost every 30 minutes
    cron.schedule('*/30 * * * *', () => this.triggerOrganicBoosts());

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

  async triggerOrganicBoosts() {
    try {
      const { decrypt } = require('../utils/encryption');
      const { getIO } = require('./socket');
      const io = getIO();

      // Find all profiles with active automation settings
      const profiles = await prisma.profile.findMany({
        where: {
          data: { contains: '"awAutomation"' }
        }
      });

      for (const profile of profiles) {
        let data = {};
        try { data = JSON.parse(profile.data); } catch (e) { continue; }
        
        const settings = data.awAutomation;
        if (!settings || (!settings.autoAvailable && !settings.rotatePhotos && !settings.tweakSummary && !settings.autoLogin)) {
          continue;
        }

        // Randomize to avoid bot patterns (only run for ~30% of scheduled profiles each time)
        if (Math.random() > 0.3) continue;

        let decryptedCredentials = null;
        if (profile.credentials) {
          const decryptedString = await decrypt(profile.credentials);
          if (decryptedString) decryptedCredentials = JSON.parse(decryptedString);
        }

        logger.info(`[Cron] Triggering organic boost for profile: ${profile.name}`);
        io.to(`agency_${profile.agencyId}`).emit('relay_command', { 
          type: 'BOOST_WEB_PROFILE', 
          profileId: profile.id, 
          payload: { 
            name: profile.name, 
            credentials: decryptedCredentials, 
            platform: 'adultwork',
            settings: settings,
            adsPowerId: decryptedCredentials?.adsPowerId || profile.adsPowerId
          } 
        });
      }
    } catch (err) {
      logger.error('Failed to trigger organic boosts:', err);
    }
  }
}

module.exports = new CronService();
