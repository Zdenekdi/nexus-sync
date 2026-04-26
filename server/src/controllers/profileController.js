const prisma = require('../services/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { getIO } = require('../services/socket');

function parseData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;        // PostgreSQL Json -> already parsed
  try { return JSON.parse(raw); } catch { return {}; }
}

exports.getProfiles = async (req, res) => {
  try {
    const { role, agencyId } = req.user;
    console.log(`[Backend Profile Fetch] User: ${req.user.name}, Role: ${role?.name || 'Unknown'}, AgencyId: ${agencyId}`);
    const isAppOwner = role?.isAppOwner;

    const profiles = await prisma.profile.findMany({
      where: isAppOwner ? {} : { agencyId },
      include: { assignees: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });

    const sanitized = profiles.map(profile => {
      const data = parseData(profile.data);
      return { ...profile, data, quickReplies: data.quickReplies || [] };
    });

    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ message: 'Server error while fetching profiles' });
  }
};

// PATCH /api/profiles/:id  — save name, phone, quickReplies, bio, description, gallery
exports.patchProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, quickReplies, bio, description, gallery } = req.body;
    const { agencyId } = req.user;

    const existing = await prisma.profile.findUnique({ where: { id } });
    if (!existing || (existing.agencyId !== agencyId && !req.user.role?.isAppOwner)) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const currentData = parseData(existing.data);
    const newData = {
      ...currentData,
      ...(quickReplies !== undefined && { quickReplies })
    };

    const updated = await prisma.profile.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(description !== undefined && { description }),
        ...(gallery !== undefined && { gallery: typeof gallery === 'string' ? gallery : JSON.stringify(gallery) }),
        data: newData
      },
      include: { assignees: { select: { id: true, name: true } } }
    });

    res.json({ ...updated, data: newData, quickReplies: newData.quickReplies || [] });
  } catch (error) {
    console.error('Error patching profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

exports.assignUsersToProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;
    const { agencyId } = req.user;
    if (!req.user.role.isManager) {
      return res.status(403).json({ message: 'Only managers can assign users to profiles' });
    }

    // Verify profile belongs to this agency
    const existing = await prisma.profile.findUnique({ where: { id }, select: { agencyId: true } });
    if (!existing || existing.agencyId !== agencyId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify all users belong to this agency
    if (userIds && userIds.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { agencyId: true } });
      if (users.length !== userIds.length || users.some(u => u.agencyId !== agencyId)) {
        return res.status(403).json({ message: 'Cannot assign users from another agency' });
      }
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: { assignees: { set: userIds.map(userId => ({ id: userId })) } },
      include: { assignees: { select: { id: true, name: true } } }
    });
    res.json(profile);
  } catch (error) {
    console.error('Error assigning users to profile:', error);
    res.status(500).json({ message: 'Failed to assign users' });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const { role, agencyId, id: userId } = req.user;
    if (!role?.isManager && !role?.isAppOwner) {
      return res.status(403).json({ message: 'Only managers or App Owner can create profiles' });
    }
    const { name, phoneNumber, targetAgencyId } = req.body;
    if (!name) return res.status(400).json({ message: 'Profile name is required' });

    const resolvedAgencyId = role?.isAppOwner && targetAgencyId ? targetAgencyId : agencyId;
    if (!resolvedAgencyId) return res.status(400).json({ message: 'Agency not found' });

    const profile = await prisma.profile.create({
      data: {
        name,
        phoneNumber: phoneNumber || null,
        agencyId: resolvedAgencyId,
        status: 'offline',
        data: JSON.stringify({ quickReplies: [] })
      },
      include: { assignees: { select: { id: true, name: true } } }
    });

    res.status(201).json({ ...profile, data: { quickReplies: [] }, quickReplies: [] });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ message: 'Failed to create profile' });
  }
};

// POST /api/profiles/:id/credentials
exports.updateCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { credentials } = req.body; // Expecting an object { adultwork: { user, pass }, ... }
    const { agencyId, role } = req.user;

    if (!role?.isManager && !role?.isAppOwner) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const encrypted = encrypt(JSON.stringify(credentials));

    await prisma.profile.update({
      where: { id },
      data: { credentials: encrypted }
    });

    res.json({ ok: true, message: 'Credentials updated and encrypted' });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ message: 'Failed to update credentials' });
  }
};

exports.syncProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { agencyId } = req.user;
    const { bio, name } = req.body;

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: { agency: true }
    });

    if (!profile || profile.agencyId !== agencyId) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // 1. Update data locally first to ensure we sync the latest
    await prisma.profile.update({
      where: { id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(name !== undefined && { name })
      }
    });

    // 2. Check if there are any active relay devices for this agency
    // In the new "Local Browser" mode, we might want to check for extension connections too.
    const activeDevices = await prisma.deviceBinding.count({
      where: { agencyId: String(agencyId), active: true }
    });

    // 3. Decrypt credentials for the relay
    let decryptedCredentials = null;
    if (profile.credentials) {
      const decryptedString = decrypt(profile.credentials);
      if (decryptedString) {
        decryptedCredentials = JSON.parse(decryptedString);
      }
    }

    // 4. Emit command to Relay devices
    const io = getIO();
    io.to(`agency_${agencyId}`).emit('relay_command', {
      type: 'SYNC_WEB_PROFILE',
      profileId: id,
      payload: {
        name: name || profile.name,
        bio: bio || profile.bio,
        adsPowerId: decryptedCredentials?.adsPowerId, // EXTRÉMNĚ DŮLEŽITÉ: Local Agent to potřebuje k otevření prohlížeče
        credentials: decryptedCredentials,
        platforms: ['adultwork', 'amateri', 'onlyfans'] // Sjednoceno s možnostmi Agenta
      }
    });

    res.json({ ok: true, message: 'Sync command dispatched to relays' });
  } catch (error) {
    console.error('Error syncing profile:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
};
