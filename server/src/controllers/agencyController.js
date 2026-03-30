const prisma = require('../services/db');
const logger = require('../services/logger');
const bcrypt = require('bcryptjs');

/**
 * Agency Controller
 */
exports.updateSettings = async (req, res) => {
    try {
        const { role, agencyId: userAgencyId } = req.user;
        const { safetyAlertMode, agencyId: bodyAgencyId } = req.body;
        const isAppOwner = role?.isAppOwner;

        if (!role?.isManager && !isAppOwner) {
            return res.status(403).json({ message: 'Only managers can update agency settings' });
        }

        const agencyId = isAppOwner ? bodyAgencyId : userAgencyId;
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
    const isAppOwner = role?.isAppOwner;
    const agencyId = isAppOwner ? req.query.agencyId : userAgencyId;

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
    const isAppOwner = role?.isAppOwner;

    if (!agencyId && !isAppOwner) {
      return res.status(404).json({ message: 'Agency context required' });
    }

    const users = await prisma.user.findMany({
      where: isAppOwner ? {} : { agencyId },
      select: {
        id: true,
        email: true,
        name: true,
        agencyId: true,
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
      agencyId: u.agencyId,
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
    const isAppOwner = role?.isAppOwner;

    if (!agencyId && !isAppOwner) return res.status(404).json({ message: 'Agency not found' });

    // 1. Total Messages (Global if Superadmin)
    const totalMessages = await prisma.message.count({
      where: isAppOwner ? {} : { chat: { agencyId } }
    });

    // 2. Total Bookings (Safety Sessions)
    const totalBookings = await prisma.safetySession.count({
      where: isAppOwner ? {} : { agencyId }
    });

    // 3. Total Calls
    const totalCalls = await prisma.callLog.count({
      where: isAppOwner ? {} : { profile: { agencyId } }
    });

    // 4. Generate trend data (last 7 days - simplified)
    const chartData = [totalMessages, totalMessages, totalMessages, totalMessages, totalMessages, totalMessages, totalMessages]; 
    
    const stats = {
      totalMessages,
      totalBookings,
      totalCalls,
      chartData,
      commissionGrowth: 'STABLE',
      revenue: `£${(totalMessages * 0.05).toFixed(2)}`,
      uptime: '100% UP'
    };

    if (isAppOwner) {
      stats.totalAgencies = await prisma.agency.count();
      stats.totalProfiles = await prisma.profile.count();
      stats.totalUsers = await prisma.user.count();
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching agency stats:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAgencies = async (req, res) => {
  try {
    const { role } = req.user;
    // Povolit přístup, pokud je role App Owner (case-insensitive)
    const isOwner = role?.isAppOwner || (typeof role === 'string' && role.toUpperCase() === 'APP OWNER') || role?.name?.toUpperCase() === 'APP OWNER';
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const agencies = await prisma.agency.findMany({
      include: {
        users: {
          where: {
            role: {
              isManager: true
            }
          },
          select: {
            name: true,
            email: true
          },
          take: 1
        },
        _count: {
          select: { users: true, profiles: true }
        }
      }
    });

    // Map to frontend expectation
    const mapped = agencies.map(a => {
      const manager = a.users[0] || null;
      return {
        id: a.id,
        name: a.name,
        email: a.email || null,
        region: a.region || 'EU',
        status: a.status || 'active',
        inviteCode: a.inviteCode || null,
        managerName: manager?.name || 'N/A',
        managerEmail: manager?.email || 'N/A',
        subscription: {
          plan: a.tier || a.plan || 'Pro',
          status: a.status || 'active',
          endDate: 'Unlimited'
        }
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('CRITICAL ERROR IN getAgencies:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner) return res.status(403).json({ message: 'Access denied' });

    const agency = await prisma.agency.findUnique({
      where: { id: req.params.id },
      include: { 
        users: {
          where: {
            role: {
              isManager: true
            }
          },
          select: {
            name: true,
            email: true
          },
          take: 1
        },
        _count: { select: { users: true, profiles: true } } 
      }
    });
    if (!agency) return res.status(404).json({ message: 'Agency not found' });

    const manager = agency.users[0] || null;

    res.json({
      id: agency.id,
      name: agency.name,
      email: agency.email || null,
      region: agency.region,
      tier: agency.tier,
      inviteCode: agency.inviteCode || null,
      managerName: manager?.name || 'N/A',
      managerEmail: manager?.email || 'N/A',
      usersCount: agency._count.users,
      profilesCount: agency._count.profiles
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner) return res.status(403).json({ message: 'Access denied' });

    const { name, region, tier, email } = req.body;
    const inviteCode = `NEXUS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const agency = await prisma.agency.create({
      data: {
        name,
        email: email || null,
        region,
        tier: tier || 'Professional',
        plan: tier || 'Professional',
        status: 'active',
        inviteCode
      }
    });

    res.status(201).json({ ...agency, inviteCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner) return res.status(403).json({ message: 'Access denied' });

    const { id } = req.params;
    await prisma.agency.delete({ where: { id } });
    res.json({ message: 'Agency deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    const { role, agencyId: userAgencyId } = req.user;
    const isAppOwner = role?.isAppOwner;
    const isManager = role?.isManager;
    
    if (!isAppOwner && !isManager) return res.status(403).json({ message: 'Access denied' });

    const { name, email, password, roleName, agencyId: bodyAgencyId } = req.body;
    const targetAgencyId = isAppOwner ? bodyAgencyId : userAgencyId;

    if (!targetAgencyId) return res.status(400).json({ message: 'Agency ID required' });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    
    // Find or create role
    let targetRole = await prisma.role.findFirst({ where: { name: roleName, agencyId: targetAgencyId } });
    if (!targetRole) {
      targetRole = await prisma.role.create({
        data: {
          name: roleName,
          agencyId: targetAgencyId,
          permissions: roleName === 'Agency Admin' ? '*' : 'messaging,profiles'
        }
      });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: targetRole.id,
        agencyId: targetAgencyId
      },
      include: { role: true }
    });

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role.name,
      avatar: newUser.name.charAt(0).toUpperCase(),
      agencyId: newUser.agencyId
    });
  } catch (error) {
    logger.error('Error adding user:', error);
    res.status(500).json({ message: error.message });
  }
};
