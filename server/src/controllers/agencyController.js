const prisma = require('../services/db');
const logger = require('../services/logger');

/**
 * Agency Controller
 */
exports.updateSettings = async (req, res) => {
    try {
        const { safetyAlertMode } = req.body;
        const agencyId = req.user.agencyId;

        if (!req.user.role.isManager) {
            return res.status(403).json({ message: 'Only managers can update agency settings' });
        }

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
    const agencyId = req.user.agencyId;
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
    const agencyId = req.user.agencyId;
    if (!agencyId) {
      // Superadmins might not have an agencyId, but they can see all users? 
      // For now, let's limit to agency for consistency.
      return res.status(404).json({ message: 'Agency context required' });
    }
    const users = await prisma.user.findMany({
      where: { agencyId },
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
