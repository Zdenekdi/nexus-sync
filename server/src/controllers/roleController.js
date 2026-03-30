const prisma = require('../services/db');
const logger = require('../services/logger');

/**
 * Role Controller - Handles dynamic permissions and add-ons
 */

exports.getRoles = async (req, res) => {
    try {
        const { agencyId } = req.query;
        const { role: userRole } = req.user;

        // Only App Owner or Agency Manager can view roles
        if (!userRole?.isAppOwner && !userRole?.isManager) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // If agencyId is provided, fetch specific agency roles. 
        // Otherwise fetch global templates (agencyId: null)
        const roles = await prisma.role.findMany({
            where: agencyId ? { agencyId } : { agencyId: null },
            orderBy: { createdAt: 'asc' }
        });

        res.json(roles.map(r => ({
            ...r,
            permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
        })));
    } catch (error) {
        logger.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
};

exports.updateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        const { role: userRole } = req.user;

        if (!userRole?.isAppOwner) {
            return res.status(403).json({ message: 'Only App Owner can modify role templates' });
        }

        const role = await prisma.role.update({
            where: { id },
            data: {
                permissions: typeof permissions === 'object' ? JSON.stringify(permissions) : permissions
            }
        });

        logger.info(`Role ${id} permissions updated by ${req.user.userId}`);
        res.json(role);
    } catch (error) {
        logger.error('Error updating role permissions:', error);
        res.status(500).json({ message: 'Failed to update role' });
    }
};

exports.purchaseAddon = async (req, res) => {
    try {
        const { agencyId, featureKey } = req.body;
        const { role: userRole } = req.user;

        // In a real app, verify payment here
        if (!userRole.isAppOwner) return res.status(403).json({ message: 'Mock purchase only for admins' });

        const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency) return res.status(404).json({ message: 'Agency not found' });

        let extras = [];
        try {
            extras = JSON.parse(agency.extraFeatures || '[]');
        } catch (e) { extras = []; }

        if (!extras.includes(featureKey)) {
            extras.push(featureKey);
        }

        await prisma.agency.update({
            where: { id: agencyId },
            data: { extraFeatures: JSON.stringify(extras) }
        });

        res.json({ success: true, extraFeatures: extras });
    } catch (error) {
        logger.error('Error purchasing addon:', error);
        res.status(500).json({ message: 'Failed to purchase addon' });
    }
};
