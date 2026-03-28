const prisma = require('../services/db');

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
      let name = profile.name;
      if (profile.id === 'ldn-01' && (name?.includes('Sophie') || !name)) {
        name = 'Diana (Central London)';
      }
      return { ...profile, name, data, quickReplies: data.quickReplies || [] };
    });

    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ message: 'Server error while fetching profiles' });
  }
};

// PATCH /api/profiles/:id  — save name, phone, quickReplies
exports.patchProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, quickReplies } = req.body;
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
    if (!req.user.role.isManager) {
      return res.status(403).json({ message: 'Only managers can assign users to profiles' });
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
