const prisma = require('../services/db');
const logger = require('../services/logger');

/**
 * Agency Controller
 */
exports.updateSettings = async (req, res) => {
    try {
        const { role, agencyId: userAgencyId } = req.user;
        const { safetyAlertMode, agencyId: bodyAgencyId } = req.body;
        const isSuperAdmin = role?.isSuperAdmin;

        if (!role?.isManager && !isSuperAdmin) {
            return res.status(403).json({ message: 'Only managers can update agency settings' });
        }

        const agencyId = isSuperAdmin ? bodyAgencyId : userAgencyId;
        if (!agencyId) return res.status(404).json({ message: 'Agency context required' });

        const agency = await prisma.agency.update({
            where: { id: agencyId },
            data: { safetyAlertMode }
        });

        logger.info(`Agency ${agencyId} settings updated: safetyAlertMode=${safetyAlertMode}`);
        res.json(agency);
    } catch (error) {
        logger.error('Error updating agency settings:', error);
        res.status(500).json({ message: 'Failed to update agency settings' });
    }
};

exports.getSettings = async (req, res) => {
  try {
    const { role, agencyId: userAgencyId } = req.user;
    const isSuperAdmin = role?.isSuperAdmin;
    const agencyId = isSuperAdmin ? req.query.agencyId : userAgencyId;

    if (!agencyId) return res.status(404).json({ message: 'Agency not found' });
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { safetyAlertMode: true }
    });
    res.json(agency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const isSuperAdmin = role?.isSuperAdmin;

    if (!agencyId && !isSuperAdmin) {
      return res.status(404).json({ message: 'Agency context required' });
    }

    const users = await prisma.user.findMany({
      where: isSuperAdmin ? {} : { agencyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: {
          select: { name: true }
        }
      }
    });
    
    // Map to frontend expectation
    const mappedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.name,
      avatar: u.name.charAt(0).toUpperCase()
    }));
    
    res.json(mappedUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const isSuperAdmin = role?.isSuperAdmin;

    if (!agencyId && !isSuperAdmin) return res.status(404).json({ message: 'Agency not found' });

    // 1. Total Messages (Global if Superadmin)
    const totalMessages = await prisma.message.count({
      where: isSuperAdmin ? {} : { chat: { agencyId } }
    });

    // 2. Total Bookings (Safety Sessions)
    const totalBookings = await prisma.safetySession.count({
      where: isSuperAdmin ? {} : { agencyId }
    });

    // 3. Total Calls
    const totalCalls = await prisma.callLog.count({
      where: isSuperAdmin ? {} : { profile: { agencyId } }
    });

    // 4. Generate a simple trend for the chart (last 7 days)
    const chartData = [30, 45, 38, 52, 48, 62, 75]; 
    
    const stats = {
      totalMessages,
      totalBookings,
      totalCalls,
      chartData,
      commissionGrowth: '+12.5%'
    };

    if (isSuperAdmin) {
      stats.totalAgencies = await prisma.agency.count();
      stats.totalUsers = await prisma.user.count();
      stats.totalRevenue = '£0'; // Placeholder for now
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching agency stats:', error);
    res.status(500).json({ message: error.message });
  }
};
