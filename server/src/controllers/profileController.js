const prisma = require('../services/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { getIO } = require('../services/socket');

function parseData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

exports.getProfiles = async (req, res) => {
  try {
    // Correct destructuring based on token payload { userId, agencyId, role }
    const { role, agencyId, userId } = req.user;
    const isAppOwner = role?.isAppOwner;
    const roleName = role?.name?.toUpperCase() || '';
    
    // Detailed log to debug empty results
    console.log(`[Backend Profile Fetch] UserID: ${userId}, AgencyID: ${agencyId}, Role: ${roleName}, IsOwner: ${isAppOwner}`);

    // If no agencyId and not app owner, we can't fetch anything safely
    if (!agencyId && !isAppOwner) {
      console.warn('[Backend Profile Fetch] Warning: No agencyId found for non-owner user');
      return res.json([]);
    }

    const profiles = await prisma.profile.findMany({
      where: isAppOwner ? {} : { agencyId: String(agencyId) },
      include: { 
        assignees: { select: { id: true, name: true, email: true } },
        deviceBindings: {
          select: { lastSeenAt: true },
          orderBy: { lastSeenAt: 'desc' },
          take: 1
        },
        bookings: {
          where: { status: 'confirmed' },
          select: { price: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`[Backend Profile Fetch] Query finished. Found ${profiles.length} profiles for agency ${agencyId}`);

    const sanitized = profiles.map(profile => {
      const data = parseData(profile.data);
      const bookings = profile.bookings || [];
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const totalBookings = bookings.length;
      const lastOnline = profile.deviceBindings?.[0]?.lastSeenAt || null;
      
      return { 
        ...profile, 
        data, 
        quickReplies: data.quickReplies || [],
        totalRevenue,
        totalBookings,
        lastOnline,
        deviceBindings: undefined,
        bookings: undefined
      };
    });

    res.json(sanitized);
  } catch (error) {
    console.error('[Backend Profile Fetch] CRITICAL ERROR:', error);
    res.status(500).json({ message: 'Server error while fetching profiles' });
  }
};

exports.patchProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, quickReplies, bio, description, gallery, commission, sampleMessages } = req.body;
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
        ...(sampleMessages !== undefined && { sampleMessages }),
        ...(commission !== undefined && { commission: Number(commission) }),
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
    const { role, agencyId } = req.user;
    const { name, phoneNumber, targetAgencyId } = req.body;
    if (!name) return res.status(400).json({ message: 'Profile name is required' });

    const resolvedAgencyId = role?.isAppOwner && targetAgencyId ? targetAgencyId : agencyId;

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

exports.updateCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { credentials } = req.body;
    const encrypted = encrypt(JSON.stringify(credentials));
    await prisma.profile.update({ where: { id }, data: { credentials: encrypted } });
    res.json({ ok: true, message: 'Credentials updated' });
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ message: 'Failed' });
  }
};

exports.syncProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { agencyId } = req.user;
    const { bio, name } = req.body;
    const profile = await prisma.profile.findUnique({ where: { id }, include: { agency: true } });
    if (!profile || profile.agencyId !== agencyId) return res.status(404).json({ message: 'Not found' });
    
    await prisma.profile.update({ where: { id }, data: { ...(bio && { bio }), ...(name && { name }) } });
    
    let decryptedCredentials = null;
    if (profile.credentials) {
      const decryptedString = decrypt(profile.credentials);
      if (decryptedString) decryptedCredentials = JSON.parse(decryptedString);
    }

    const io = getIO();
    io.to(`agency_${agencyId}`).emit('relay_command', {
      type: 'SYNC_WEB_PROFILE',
      profileId: id,
      payload: { name: name || profile.name, bio: bio || profile.bio, credentials: decryptedCredentials, platforms: ['adultwork', 'amateri', 'onlyfans'] }
    });
    res.json({ ok: true, message: 'Sync command dispatched' });
  } catch (error) {
    console.error('Error syncing profile:', error);
    res.status(500).json({ message: 'Failed' });
  }
};
