const prisma = require('../services/db');

exports.getProfiles = async (req, res) => {
  try {
    if (req.user.isSuperAdmin) {
      return res.json([]);
    }

    const profiles = await prisma.profile.findMany({
      where: { agencyId: req.user.agencyId },
      include: {
        assignees: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    const sanitizedProfiles = profiles.map(profile => ({
      ...profile,
      data: profile.data ? JSON.parse(profile.data) : {}
    }));

    res.json(sanitizedProfiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ message: 'Server error while fetching profiles' });
  }
};

exports.assignUsersToProfile = async (req, res) => {
    try {
        const { id } = req.params; // profile id
        const { userIds } = req.body; // array of user ids

        if (!req.user.role.isManager) {
            return res.status(403).json({ message: 'Only managers can assign users to profiles' });
        }

        const profile = await prisma.profile.update({
            where: { id },
            data: {
                assignees: {
                    set: userIds.map(userId => ({ id: userId }))
                }
            },
            include: {
                assignees: { select: { id: true, name: true } }
            }
        });

        res.json(profile);
    } catch (error) {
        console.error('Error assigning users to profile:', error);
        res.status(500).json({ message: 'Failed to assign users' });
    }
};
