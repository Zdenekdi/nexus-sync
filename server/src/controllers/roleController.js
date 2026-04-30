const prisma = require('../services/db');
const logger = require('../services/logger');
const { logAction } = require('./auditController');

/**
 * Role Controller - Handles dynamic permissions and add-ons
 */

/**
 * Helper used by agencyController & auditController.
 * Returns true if the user effectively has Agency Admin privileges:
 *   - role name is 'Agency Admin', OR
 *   - role name is 'Manager' AND the agency-specific role has merged_with_admin: true
 * Does a single DB lookup, only called on the 3 sensitive operations.
 */
exports.isEffectiveAdmin = async (userRole, userAgencyId) => {
    if (userRole?.isAppOwner) return true;
    if (userRole?.name === 'Agency Admin') return true;
    if (userRole?.name === 'Manager' && userAgencyId) {
        try {
            const role = await prisma.role.findFirst({
                where: { name: 'Manager', agencyId: userAgencyId }
            });
            if (!role) return false;
            const perms = typeof role.permissions === 'string'
                ? JSON.parse(role.permissions)
                : (role.permissions || {});
            return perms.merged_with_admin === true;
        } catch { return false; }
    }
    return false;
};

exports.getRoles = async (req, res) => {
    try {
        const { agencyId } = req.query;
        const { role: userRole } = req.user;

        // Only App Owner or Agency Manager can view roles
        if (!userRole?.isAppOwner && !userRole?.isManager) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // App Owner can view any, managers restricted to their agency
        const whereClause = !userRole.isAppOwner && agencyId ? { agencyId } : (agencyId ? { agencyId } : { agencyId: null });

        let roles = await prisma.role.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' }
        });

        // Auto-seed and cleanup global templates if they are missing (only for global view)
        if (!agencyId) {
            const expectedTemplates = [
                { name: 'App Owner', isAppOwner: true, isManager: true, permissions: JSON.stringify({ all: true }) },
                { name: 'Agency Admin', isAppOwner: false, isManager: true, permissions: JSON.stringify({ permissions: true, hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, audit_logs: true, qa_hub: true, settings: true, referrals: true, inventory: true, plans: true }) },
                { name: 'Manager', isAppOwner: false, isManager: true, permissions: JSON.stringify({ hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, audit_logs: true, settings: true, qa_hub: true, referrals: true, inventory: true }) },
                { name: 'Senior Operator', isAppOwner: false, isManager: true, permissions: JSON.stringify({ hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: false, settings: true, qa_hub: true, referrals: true, inventory: true }) },
                { name: 'Operator', isAppOwner: false, isManager: false, permissions: JSON.stringify({ messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, settings: true, referrals: false, inventory: false }) },
                { name: 'Model', isAppOwner: false, isManager: false, permissions: JSON.stringify({ messaging: true, calendar: true, device_setup: true, settings: true, referrals: true, inventory: false }) }
            ];

            // 1. DEDUPLICATION: Aggressive fix for "2x Operator" or similar issues
            // We search for both NULL and empty string agencyId to catch all global-scope roles
            const allGlobal = await prisma.role.findMany({ 
                where: { 
                    OR: [
                        { agencyId: null },
                        { agencyId: '' }
                    ]
                } 
            });
            const byName = {};
            for (const r of allGlobal) {
                // Aggressive normalization: lowercase, trim, remove accents
                const norm = r.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (!byName[norm]) byName[norm] = [];
                byName[norm].push(r);
            }

            let wasCleaned = false;
            for (const norm in byName) {
                if (byName[norm].length > 1 || byName[norm].some(r => r.agencyId === '')) {
                    const primaryName = byName[norm][0].name.trim();
                    const standardSlug = `global-${primaryName.toLowerCase().replace(/\s+/g, '-')}`;
                    
                    // Sort: Standard slug first, then by creation date
                    const sorted = byName[norm].sort((a, b) => {
                        if (a.id === standardSlug) return -1;
                        if (b.id === standardSlug) return 1;
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    });
                    
                    const keep = sorted[0];
                    const toDelete = sorted.slice(1);
                    
                    for (const d of toDelete) {
                        // Critical: Reassign users to the kept role before deleting
                        await prisma.user.updateMany({ where: { roleId: d.id }, data: { roleId: keep.id } });
                        // Also handle references in other tables if they exist (though schema suggests only User)
                        await prisma.role.delete({ where: { id: d.id } }).catch(err => {
                            console.error(`Failed to delete ghost role ${d.id}:`, err);
                        });
                        wasCleaned = true;
                    }
                }
            }

            // 2. SEEDING: Ensure all expected templates exist
            const finalGlobal = wasCleaned ? await prisma.role.findMany({ where: { agencyId: null } }) : allGlobal.filter(r => r.agencyId === null);
            const existingNormNames = finalGlobal.map(r => r.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            const toCreate = expectedTemplates.filter(t => {
                const tNorm = t.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return !existingNormNames.includes(tNorm);
            });

            if (toCreate.length > 0 || wasCleaned) {
                for (const t of toCreate) {
                    const slug = `global-${t.name.toLowerCase().replace(/\s+/g, '-')}`;
                    await prisma.role.upsert({
                        where: { id: slug },
                        update: {},
                        create: { ...t, id: slug }
                    }).catch(e => console.error('Upsert warn:', e));
                }

                roles = await prisma.role.findMany({
                    where: { agencyId: null },
                    orderBy: { createdAt: 'asc' }
            }

            // FINAL SAFETY: Ensure no duplicates are returned in the global view list
            const seen = new Set();
            roles = roles.filter(r => {
                const norm = r.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (seen.has(norm)) return false;
                seen.add(norm);
                return true;
            });
        }

        const parsedRoles = roles.map(r => {
            let perms = {};
            if (typeof r.permissions === 'string') {
                try {
                    perms = JSON.parse(r.permissions);
                } catch (e) {
                    // Fallback for older non-JSON roles like '*' or 'messaging,profiles'
                    if (r.name === 'Agency Admin') {
                        perms = { permissions: true, hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, audit_logs: true, qa_hub: true, settings: true, referrals: true, inventory: true, plans: true };
                    } else if (r.name === 'Model') {
                        perms = { messaging: true, calendar: true, device_setup: true, settings: true, referrals: true };
                    } else if (r.name === 'Senior Operator') {
                        perms = { hierarchy: true, analytics: true, messaging: true, calendar: true, profiles: true, web_profiles: true, settings: true, qa_hub: true, referrals: true, inventory: true };
                    } else if (r.name === 'Operator') {
                        perms = { messaging: true, calendar: true, profiles: true, web_profiles: true, device_setup: true, settings: true };
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
        logAction(req.user.agencyId, req.user.userId || req.user.id, 'ROLE_UPDATED', `Role "${existingRole.name}" permissions changed`);
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

/**
 * Toggle merged_with_admin flag on an agency-specific Manager role.
 * App Owner only. Allows smaller agencies to merge Manager + Agency Admin privileges.
 */
exports.toggleAdminMerge = async (req, res) => {
    try {
        const { id } = req.params;
        const { role: userRole } = req.user;

        if (!userRole?.isAppOwner) {
            return res.status(403).json({ message: 'Only App Owner can merge roles' });
        }

        const existing = await prisma.role.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Role not found' });
        if (existing.name !== 'Manager') {
            return res.status(400).json({ message: 'Only Manager role can be merged with Agency Admin' });
        }
        if (!existing.agencyId) {
            return res.status(400).json({ message: 'Cannot merge global role templates' });
        }

        let perms = {};
        try {
            perms = typeof existing.permissions === 'string'
                ? JSON.parse(existing.permissions)
                : (existing.permissions || {});
        } catch { perms = {}; }

        const wasMerged = perms.merged_with_admin === true;
        const newMerged = !wasMerged;

        if (newMerged) {
            perms = { ...perms, merged_with_admin: true, settings: true, audit_logs: true, can_add_users: true, plans: true };
        } else {
            const { merged_with_admin, can_add_users, ...rest } = perms;
            perms = { ...rest, settings: false, audit_logs: false, plans: false };
        }

        await prisma.role.update({ where: { id }, data: { permissions: JSON.stringify(perms) } });

        logger.info(`Manager role (${id}) admin-merge → ${newMerged}`);
        logAction(existing.agencyId, req.user.userId, 'ROLE_MERGE_TOGGLED',
            `Manager role merged_with_admin set to ${newMerged}`);

        res.json({ success: true, merged: newMerged, permissions: perms });
    } catch (error) {
        logger.error('Error toggling admin merge:', error);
        res.status(500).json({ message: 'Failed to toggle role merge' });
    }
};
