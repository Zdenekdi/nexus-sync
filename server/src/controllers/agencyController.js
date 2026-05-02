const prisma = require('../services/db');
const logger = require('../services/logger');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getRoomSize } = require('../services/socket');
const { isEffectiveAdmin } = require('./roleController');

/**
 * Agency Controller
 */
exports.updateSettings = async (req, res) => {
    try {
        const { role, agencyId: userAgencyId } = req.user;
        const { safetyAlertMode, agencyId: bodyAgencyId, name, email, region, defaultGraceMinutes, currency, timezone, aiInstructions } = req.body;
        const isAppOwner = role?.isAppOwner;
        const effectiveAdmin = await isEffectiveAdmin(role, userAgencyId);

        // Only Agency Admin (or merged Manager) or App Owner can change agency settings
        if (!isAppOwner && !effectiveAdmin) {
            return res.status(403).json({ message: 'Only Agency Admin can update agency settings' });
        }

        const agencyId = isAppOwner ? bodyAgencyId : userAgencyId;
        if (!agencyId) return res.status(404).json({ message: 'Agency context required' });

        const updateData = {};
        if (safetyAlertMode !== undefined) updateData.safetyAlertMode = safetyAlertMode;
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (region !== undefined) updateData.region = region;
        if (defaultGraceMinutes !== undefined) updateData.defaultGraceMinutes = defaultGraceMinutes;
        if (currency !== undefined) updateData.currency = currency;
        if (timezone !== undefined) updateData.timezone = timezone;
        if (aiInstructions !== undefined) updateData.aiInstructions = aiInstructions;

        const agency = await prisma.agency.update({
            where: { id: agencyId },
            data: updateData
        });

        logger.info(`Agency ${agencyId} settings updated by ${req.user.id}`);
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
      select: { id: true, name: true, tier: true, plan: true, safetyAlertMode: true, inviteCode: true, referralCode: true, aiInstructions: true, email: true, region: true }
    });
    if (!agency) return res.status(404).json({ message: 'Agency not found' });
    res.json(agency);
  } catch (error) {
    logger.error('Error fetching agency settings:', error);
    res.status(500).json({ message: 'Failed to fetch agency settings' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const isAppOwner = role?.isAppOwner;

    if (!agencyId && !isAppOwner) {
      return res.status(404).json({ message: 'Agency context required' });
    }

    if (!isAppOwner && !role?.isManager) {
      return res.status(403).json({ message: 'Access denied: Manager permission required to view users' });
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
    logger.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to load users' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const isAppOwner = role?.isAppOwner;

    if (!agencyId && !isAppOwner) return res.status(404).json({ message: 'Agency not found' });

    if (!isAppOwner && !role?.isManager) {
      return res.status(403).json({ message: 'Access denied: Manager permission required to view stats' });
    }

    const agencyFilter = isAppOwner ? {} : { agencyId };

    const [totalMessages, totalBookings, totalCalls] = await Promise.all([
      prisma.message.count({ where: isAppOwner ? {} : { chat: { agencyId } } }),
      prisma.safetySession.count({ where: agencyFilter }),
      prisma.callLog.count({ where: isAppOwner ? {} : { profile: { agencyId } } })
    ]);

    // Real chart data from DailyStat (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyStats = await prisma.dailyStat.findMany({
      where: { ...(isAppOwner ? {} : { agencyId }), date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' }
    });
    const chartData = dailyStats.length > 0
      ? dailyStats.map(d => d.revenue || d.bookingsCount || 0)
      : [totalMessages, totalMessages, totalMessages, totalMessages, totalMessages, totalMessages, totalMessages];

    const totalRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);

    const stats = {
      totalMessages,
      totalBookings,
      totalCalls,
      chartData,
      commissionGrowth: 'STABLE',
      revenue: totalRevenue > 0 ? `£${totalRevenue.toFixed(2)}` : `£${(totalMessages * 0.05).toFixed(2)}`,
      uptime: '100% UP'
    };

    if (isAppOwner) {
      const [totalAgencies, totalProfiles, totalUsers] = await Promise.all([
        prisma.agency.count(),
        prisma.profile.count(),
        prisma.user.count()
      ]);
      stats.totalAgencies = totalAgencies;
      stats.totalProfiles = totalProfiles;
      stats.totalUsers = totalUsers;
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching agency stats:', error);
    res.status(500).json({ message: 'Failed to load statistics' });
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
          orderBy: {
            role: { name: 'asc' }
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
    res.status(500).json({ message: 'Failed to load agencies' });
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
          orderBy: {
            role: { name: 'asc' }
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
    logger.error('Error fetching agency with profiles:', error);
    res.status(500).json({ message: 'Failed to fetch agency details' });
  }
};

exports.createAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner) return res.status(403).json({ message: 'Access denied' });

    const { name, region, tier, email } = req.body;
    if (!name || !region) return res.status(400).json({ message: 'Name and region are required' });

    const inviteCode = `NEXUS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const agency = await prisma.agency.create({
      data: {
        name,
        email: email || null,
        region,
        tier: tier || 'Professional',
        plan: tier || 'Professional',
        inviteCode
      }
    });

    res.status(201).json({ ...agency, inviteCode });
  } catch (error) {
    logger.error('Error creating agency:', error);
    res.status(500).json({ message: 'Failed to create agency' });
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
    logger.error('Error deleting agency:', error);
    res.status(500).json({ message: 'Failed to delete agency' });
  }
};

exports.addUser = async (req, res) => {
  try {
    const { role, agencyId: userAgencyId } = req.user;
    const isAppOwner = role?.isAppOwner;
    const effectiveAdmin = await isEffectiveAdmin(role, userAgencyId);

    // Only Agency Admin (or merged Manager) or App Owner can add users
    if (!isAppOwner && !effectiveAdmin) return res.status(403).json({ message: 'Only Agency Admin can add users' });

    const { name, email, password, roleName: bodyRoleName, role: bodyRole, agencyId: bodyAgencyId } = req.body;
    const roleName = bodyRole || bodyRoleName || 'Operator';
    const targetAgencyId = isAppOwner ? bodyAgencyId : userAgencyId;

    if (!targetAgencyId) return res.status(400).json({ message: 'Agency ID required' });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    if (!password) return res.status(400).json({ message: 'Password is required' });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Find or create role
    let targetRole = await prisma.role.findFirst({ where: { name: roleName, agencyId: targetAgencyId } });
    if (!targetRole) {
      const globalTemplate = await prisma.role.findFirst({
        where: { name: roleName, agencyId: null }
      });
      const defaultPerms = JSON.stringify(roleName === 'Agency Admin' ? { all: true } : { messaging: true });

      targetRole = await prisma.role.create({
        data: {
          name: roleName,
          agencyId: targetAgencyId,
          permissions: globalTemplate ? globalTemplate.permissions : defaultPerms
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
    res.status(500).json({ message: 'Failed to add user' });
  }
};

exports.getRelayStatus = async (req, res) => {
  try {
    const { agencyId } = req.user;
    if (!agencyId) return res.status(400).json({ message: 'Agency ID required' });

    const connectedCount = getRoomSize(`agency_${agencyId}`);
    
    res.json({ 
      online: connectedCount > 0,
      activeRelays: connectedCount,
      message: connectedCount > 0 ? 'Local Agent is online' : 'No Local Agents connected'
    });
  } catch (error) {
    logger.error('Error getting relay status:', error);
    res.status(500).json({ message: 'Failed to get relay status' });
  }
};
