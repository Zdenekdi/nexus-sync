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
        const agency = await prisma.agency.findUnique({
            where: { id: agencyId },
            select: { id: true, name: true, safetyAlertMode: true }
        });
        res.json(agency);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch agency settings' });
    }
};
