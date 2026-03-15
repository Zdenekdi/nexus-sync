const prisma = require('../services/db');

exports.getProfiles = async (req, res) => {
  try {
    // Superadmins do not manage profiles, they only handle system administration
    if (req.user.isSuperAdmin) {
      return res.json([]);
    }

    const profiles = await prisma.profile.findMany({
      where: { agencyId: req.user.agencyId },
      orderBy: { name: 'asc' }
    });

    // Parse the 'data' JSON string for each profile if it exists
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
