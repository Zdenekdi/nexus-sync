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

        let roles = await prisma.role.findMany({
            where: agencyId ? { agencyId } : { agencyId: null },
            orderBy: { createdAt: 'asc' }
        });

        // Auto-seed global templates if they are missing
        if (!agencyId) {
            const expectedTemplates = [
                { name: 'App Owner', isAppOwner: true, isManager: true, permissions: JSON.stringify({ all: true }) },
                { name: 'Agency Admin', isAppOwner: false, isManager: true, permissions: JSON.stringify({ permissions: true, hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, audit_logs: true, qa_hub: true, settings: true, inventory: false }) },
                { name: 'Senior Operator', isAppOwner: false, isManager: true, permissions: JSON.stringify({ messaging: true, calendar: true, profiles: true, device_setup: true, settings: true, qa_hub: true, analytics: true, inventory: false }) },
                { name: 'Operator', isAppOwner: false, isManager: false, permissions: JSON.stringify({ messaging: true, calendar: true, profiles: true, device_setup: true, settings: true, inventory: false }) },
                { name: 'Model', isAppOwner: false, isManager: false, permissions: JSON.stringify({ messaging: true, calendar: true, inventory: false }) }
            ];

            const existingNames = roles.map(r => r.name);
            const toCreate = expectedTemplates.filter(t => !existingNames.includes(t.name));

            if (toCreate.length > 0) {
                // Bulk create missing templates
                for (const t of toCreate) {
                    await prisma.role.upsert({
                        where: { id: `global-${t.name}` },
                        update: {},
                        create: { ...t, id: `global-${t.name.toLowerCase().replace(' ', '-')}` }
                    }).catch(e => console.error('Upsert warn:', e));
                }
                
                roles = await prisma.role.findMany({
                    where: { agencyId: null },
                    orderBy: { createdAt: 'asc' }
                });
            }
        }

        const parsedRoles = roles.map(r => {
            let perms = {};
            if (typeof r.permissions === 'string') {
                try {
                    perms = JSON.parse(r.permissions);
                } catch (e) {
                    // Fallback for older non-JSON roles like '*' or 'messaging,profiles'
                    if (r.name === 'Agency Admin') {
                        perms = { permissions: true, hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, audit_logs: true, qa_hub: true, settings: true, inventory: false };
                    } else if (r.name === 'Model') {
                        perms = { messaging: true, calendar: true };
                    } else if (r.name === 'Operator') {
                        perms = { messaging: true, calendar: true, profiles: true, device_setup: true, settings: true };
                    }
                }
            } else {
                perms = r.permissions;
            }
            return { ...r, permissions: perms };
        });

        res.json(parsedRoles);
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

        if (!userRole?.isAppOwner && !userRole?.isManager) {
            return res.status(403).json({ message: 'Not authorized to modify roles' });
        }

        const existingRole = await prisma.role.findUnique({ where: { id } });
        if (!existingRole) {
            return res.status(404).json({ message: 'Role not found' });
        }

        if (!userRole.isAppOwner) {
            // Agency managers can only modify roles belonging to their agency, and never global templates
            if (!existingRole.agencyId || existingRole.agencyId !== req.user.agencyId) {
                return res.status(403).json({ message: 'Can only modify roles for your own agency' });
            }
        }

        const serializedPerms = typeof permissions === 'object' ? JSON.stringify(permissions) : permissions;

        const role = await prisma.role.update({
            where: { id },
            data: { permissions: serializedPerms }
        });

        // Cascade global template updates down to all agencies using this role
        if (!existingRole.agencyId) {
            await prisma.role.updateMany({
                where: { name: existingRole.name, agencyId: { not: null } },
                data: { permissions: serializedPerms }
            });
            logger.info(`Global role template "${existingRole.name}" edited. Changes cascaded to all agencies.`);
        }

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
