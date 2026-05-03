const prisma = require('../services/db');
const logger = require('../services/logger');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getRoomSize } = require('../services/socket');
const { isEffectiveAdmin } = require('./roleController');

exports.getUsers = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const isAppOwner = !!role?.isAppOwner;
    
    // Normalize role name to uppercase for comparison
    const roleName = String(role?.name || '').toUpperCase().trim();
    const isManager = !!role?.isManager || 
                     ['SENIOR OPERATOR', 'MANAGER', 'AGENCY ADMIN', 'OWNER', 'APP OWNER'].includes(roleName);

    console.log(`[Backend getUsers] User: ${req.user.userId}, Agency: ${agencyId}, Role: ${roleName}, IsManager: ${isManager}`);

    if (!isAppOwner && !isManager) {
      return res.status(403).json({ message: `Access denied: ${roleName} is not a manager role` });
    }

    const users = await prisma.user.findMany({
      where: isAppOwner ? {} : { agencyId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        agencyId: true, 
        role: { select: { name: true } } 
      }
    });
    
    console.log(`[Backend getUsers] Found ${users.length} users for agency ${agencyId}`);

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
    console.error('[Backend getUsers] ERROR:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const isAppOwner = !!role?.isAppOwner;
    const roleName = String(role?.name || '').toUpperCase();
    const isManager = !!role?.isManager || ['SENIOR OPERATOR', 'MANAGER', 'AGENCY ADMIN', 'OWNER'].includes(roleName);

    if (!isAppOwner && !isManager) return res.status(403).json({ message: 'Denied' });

    const agencyFilter = isAppOwner ? {} : { agencyId };

    const [totalMessages, totalBookings, totalCalls] = await Promise.all([
      prisma.message.count({ where: isAppOwner ? {} : { chat: { agencyId } } }),
      prisma.safetySession.count({ where: agencyFilter }),
      prisma.callLog.count({ where: isAppOwner ? {} : { profile: { agencyId } } })
    ]);

    res.json({
      totalMessages,
      totalBookings,
      totalCalls,
      revenue: '£0.00',
      uptime: '100% UP',
      chartData: [0,0,0,0,0,0,0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.updateSettings = async (req, res) => {
    try {
        const { role, agencyId: userAgencyId } = req.user;
        const { safetyAlertMode, agencyId: bodyAgencyId, name, email, region, defaultGraceMinutes, currency, timezone, aiInstructions } = req.body;
        const isAppOwner = role?.isAppOwner;
        const effectiveAdmin = await isEffectiveAdmin(role, userAgencyId);
        if (!isAppOwner && !effectiveAdmin) return res.status(403).json({ message: 'Forbidden' });
        const agencyId = isAppOwner ? bodyAgencyId : userAgencyId;
        const agency = await prisma.agency.update({ where: { id: agencyId }, data: { ...(safetyAlertMode && { safetyAlertMode }), ...(name && { name }), ...(email && { email }), ...(region && { region }), ...(defaultGraceMinutes && { defaultGraceMinutes }), ...(currency && { currency }), ...(timezone && { timezone }), ...(aiInstructions && { aiInstructions }) } });
        res.json(agency);
    } catch (error) {
        res.status(500).json({ message: 'Failed' });
    }
};

exports.getSettings = async (req, res) => {
  try {
    const { role, agencyId: userAgencyId } = req.user;
    const isAppOwner = role?.isAppOwner;
    const agencyId = isAppOwner ? req.query.agencyId : userAgencyId;
    const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, name: true, tier: true, plan: true, safetyAlertMode: true, inviteCode: true, referralCode: true, aiInstructions: true, email: true, region: true } });
    res.json(agency || {});
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.getAgencies = async (req, res) => {
  try {
    const { role } = req.user;
    const isOwner = role?.isAppOwner || String(role?.name || '').toUpperCase() === 'APP OWNER';
    if (!isOwner) return res.status(403).json({ message: 'Access denied' });
    const agencies = await prisma.agency.findMany({ include: { users: { where: { role: { isManager: true } }, take: 1, select: { name: true, email: true } }, _count: { select: { users: true, profiles: true } } } });
    res.json(agencies.map(a => ({ id: a.id, name: a.name, region: a.region, status: 'active', managerName: a.users[0]?.name || 'N/A', usersCount: a._count.users, profilesCount: a._count.profiles })));
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.getAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner && String(role?.name || '').toUpperCase() !== 'APP OWNER') return res.status(403).json({ message: 'Access denied' });
    const agency = await prisma.agency.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true, profiles: true } } } });
    if (!agency) return res.status(404).json({ message: 'Not found' });
    res.json({ ...agency, usersCount: agency._count.users, profilesCount: agency._count.profiles });
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.createAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner && String(role?.name || '').toUpperCase() !== 'APP OWNER') return res.status(403).json({ message: 'Access denied' });
    const { name, region, tier } = req.body;
    const inviteCode = `NEXUS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const agency = await prisma.agency.create({ data: { name, region, tier: tier || 'Professional', plan: tier || 'Professional', inviteCode } });
    res.status(201).json(agency);
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.deleteAgency = async (req, res) => {
  try {
    const { role } = req.user;
    if (!role?.isAppOwner && String(role?.name || '').toUpperCase() !== 'APP OWNER') return res.status(403).json({ message: 'Access denied' });
    await prisma.agency.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.addUser = async (req, res) => {
  try {
    const { role, agencyId: userAgencyId } = req.user;
    const isAppOwner = !!role?.isAppOwner;
    const effectiveAdmin = await isEffectiveAdmin(role, userAgencyId);
    if (!isAppOwner && !effectiveAdmin) return res.status(403).json({ message: 'Forbidden' });
    const { name, email, password, roleName: bodyRoleName, agencyId: bodyAgencyId } = req.body;
    const targetAgencyId = isAppOwner ? bodyAgencyId : userAgencyId;
    const hashedPassword = await bcrypt.hash(password, 10);
    let targetRole = await prisma.role.findFirst({ where: { name: bodyRoleName, agencyId: targetAgencyId } });
    if (!targetRole) {
      targetRole = await prisma.role.create({ data: { name: bodyRoleName, agencyId: targetAgencyId, permissions: JSON.stringify({ all: true }) } });
    }
    const newUser = await prisma.user.create({ data: { name, email, password: hashedPassword, roleId: targetRole.id, agencyId: targetAgencyId }, include: { role: true } });
    res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role.name, agencyId: newUser.agencyId });
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};

exports.getRelayStatus = async (req, res) => {
  try {
    const { agencyId } = req.user;
    const connectedCount = getRoomSize(`agency_${agencyId}`);
    res.json({ online: connectedCount > 0, activeRelays: connectedCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed' });
  }
};
