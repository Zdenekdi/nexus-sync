const prisma = require('../services/db');
const logger = require('../services/logger');
const { getPhoneLookupValues, normalizePhoneNumber } = require('../utils/phoneNumber');

/**
 * Client Controller (CRM)
 */
exports.getClients = async (req, res) => {
  try {
    const { agencyId } = req.user;
    if (!agencyId) return res.status(400).json({ message: 'Agency ID required' });

    const clients = await prisma.client.findMany({
      where: { agencyId },
      orderBy: { lastVisit: 'desc' },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });

    res.json(clients);
  } catch (error) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
};

exports.getClientByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const { agencyId } = req.user;
    const phoneVariants = getPhoneLookupValues(phone);

    const client = await prisma.client.findFirst({
      where: {
        agencyId,
        phone: { in: phoneVariants.length ? phoneVariants : [normalizePhoneNumber(phone)] }
      },
      include: {
        bookings: {
          take: 5,
          orderBy: { startTime: 'desc' },
          include: { profile: { select: { name: true } } }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (error) {
    logger.error('Error fetching client by phone:', error);
    res.status(500).json({ message: 'Failed to fetch client details' });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { agencyId } = req.user;
    const { name, tags, preferences } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(preferences !== undefined && { preferences })
      }
    });

    res.json(client);
  } catch (error) {
    logger.error('Error updating client:', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
};

exports.getClientStats = async (req, res) => {
  try {
    const { agencyId } = req.user;
    
    const [totalClients, vipClients, totalRevenue] = await Promise.all([
      prisma.client.count({ where: { agencyId } }),
      prisma.client.count({ where: { agencyId, tags: { contains: 'VIP' } } }),
      prisma.client.aggregate({
        where: { agencyId },
        _sum: { totalSpent: true }
      })
    ]);

    res.json({
      totalClients,
      vipClients,
      totalRevenue: totalRevenue._sum.totalSpent || 0
    });
  } catch (error) {
    logger.error('Error fetching CRM stats:', error);
    res.status(500).json({ message: 'Failed to fetch CRM stats' });
  }
};
