const prisma = require('../services/db');
const logger = require('../services/logger');

class EmergencyController {
  /**
   * GET /api/emergencies
   * List emergency events for the agency with receipt info.
   */
  async getEvents(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const days = Math.min(90, parseInt(req.query.days) || 30);
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 20);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        session: { agencyId },
        createdAt: { gte: startDate }
      };

      const [events, total] = await Promise.all([
        prisma.emergencyEvent.findMany({
          where,
          include: {
            session: {
              select: {
                id: true, profileId: true, state: true,
                profile: { select: { name: true } }
              }
            },
            receipts: {
              select: { id: true, recipientId: true, recipientRole: true, deliveredAt: true, acknowledgedAt: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.emergencyEvent.count({ where })
      ]);

      res.json({ events, total, page });
    } catch (err) {
      logger.error('getEvents error:', err);
      res.status(500).json({ message: 'Failed to fetch emergency events' });
    }
  }

  /**
   * GET /api/emergencies/stats
   * Emergency statistics for the agency.
   */
  async getStats(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const events = await prisma.emergencyEvent.findMany({
        where: { session: { agencyId } },
        include: { receipts: true }
      });

      const totalReceipts = events.reduce((s, e) => s + e.receipts.length, 0);
      const acked = events.reduce((s, e) => s + e.receipts.filter(r => r.acknowledgedAt).length, 0);

      // Average acknowledgment time in seconds
      let totalAckTime = 0;
      let ackCount = 0;
      events.forEach(e => {
        e.receipts.forEach(r => {
          if (r.acknowledgedAt) {
            totalAckTime += (new Date(r.acknowledgedAt) - new Date(r.deliveredAt)) / 1000;
            ackCount++;
          }
        });
      });

      res.json({
        totalEmergencies: events.length,
        byType: {
          panic: events.filter(e => e.type === 'panic').length,
          timeout: events.filter(e => e.type === 'timeout').length,
          departure_timeout: events.filter(e => e.type === 'departure_timeout').length
        },
        bySeverity: {
          high: events.filter(e => e.severity === 'high').length,
          critical: events.filter(e => e.severity === 'critical').length
        },
        receipts: {
          total: totalReceipts,
          acknowledged: acked,
          pending: totalReceipts - acked,
          avgAckTimeSec: ackCount > 0 ? Math.round(totalAckTime / ackCount) : null
        }
      });
    } catch (err) {
      logger.error('getStats error:', err);
      res.status(500).json({ message: 'Failed to fetch emergency stats' });
    }
  }

  /**
   * GET /api/emergencies/:id
   * Detailed view of a single emergency event.
   */
  async getDetail(req, res) {
    try {
      const { id } = req.params;
      const agencyId = req.user?.agencyId;

      const event = await prisma.emergencyEvent.findUnique({
        where: { id },
        include: {
          session: {
            include: {
              profile: { select: { id: true, name: true } },
              locationPoints: { orderBy: { capturedAt: 'desc' }, take: 20 }
            }
          },
          receipts: true
        }
      });

      if (!event) return res.status(404).json({ message: 'Event not found' });
      if (event.session.agencyId !== agencyId) return res.status(403).json({ message: 'Access denied' });

      res.json(event);
    } catch (err) {
      logger.error('getDetail error:', err);
      res.status(500).json({ message: 'Failed to fetch emergency detail' });
    }
  }

  /**
   * PATCH /api/emergencies/receipts/:id/acknowledge
   * Acknowledge an emergency receipt.
   */
  async acknowledgeReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const receipt = await prisma.emergencyReceipt.findUnique({ where: { id } });
      if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
      if (receipt.recipientId !== userId) {
        return res.status(403).json({ message: 'Not your receipt' });
      }

      const updated = await prisma.emergencyReceipt.update({
        where: { id },
        data: { acknowledgedAt: new Date() }
      });

      res.json(updated);
    } catch (err) {
      logger.error('acknowledgeReceipt error:', err);
      res.status(500).json({ message: 'Failed to acknowledge receipt' });
    }
  }
}

module.exports = new EmergencyController();
