const prisma = require('../services/db');
const logger = require('../services/logger');
const { getIO } = require('../services/socket');

/**
 * Blacklist Controller — Shared cross-agency dangerous client database
 */
class BlacklistController {

    /** List all blacklist entries with search & pagination */
    async list(req, res) {
        try {
            const { search, severity, page = 1, limit = 50 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);

            const where = {};
            if (severity) where.severity = severity;
            if (search) {
                where.OR = [
                    { phone: { contains: search } },
                    { licensePlate: { contains: search } },
                    { name: { contains: search } },
                    { description: { contains: search } }
                ];
            }

            const [entries, total] = await Promise.all([
                prisma.blacklistEntry.findMany({
                    where,
                    include: { reports: { select: { agencyId: true, reportedByName: true, comment: true, createdAt: true } } },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit)
                }),
                prisma.blacklistEntry.count({ where })
            ]);

            res.json({ entries, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
        } catch (error) {
            logger.error('Blacklist list error:', error);
            res.status(500).json({ message: 'Failed to load blacklist' });
        }
    }

    /** Create a new blacklist entry */
    async create(req, res) {
        try {
            const { phone, licensePlate, name, description, severity = 'warning' } = req.body;
            const { userId, agencyId } = req.user;

            if (!description) {
                return res.status(400).json({ message: 'Description is required' });
            }
            if (!phone && !licensePlate && !name) {
                return res.status(400).json({ message: 'At least one identifier (phone, license plate, or name) is required' });
            }

            const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

            const entry = await prisma.blacklistEntry.create({
                data: {
                    phone: phone || null,
                    licensePlate: licensePlate ? licensePlate.toUpperCase() : null,
                    name: name || null,
                    description,
                    severity,
                    createdById: userId,
                    createdByName: user?.name || 'Unknown',
                    agencyId
                },
                include: { reports: true }
            });

            // Broadcast to all connected users
            try {
                const io = getIO();
                io.emit('blacklist_new', {
                    id: entry.id,
                    phone: entry.phone,
                    licensePlate: entry.licensePlate,
                    name: entry.name,
                    severity: entry.severity,
                    createdByName: entry.createdByName
                });
            } catch (e) { /* socket not available */ }

            logger.info(`Blacklist entry created: ${entry.id} by user ${userId}`);
            res.status(201).json(entry);
        } catch (error) {
            logger.error('Blacklist create error:', error);
            res.status(500).json({ message: 'Failed to create blacklist entry' });
        }
    }

    /** Update own blacklist entry */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.user;
            const { phone, licensePlate, name, description, severity } = req.body;

            const existing = await prisma.blacklistEntry.findUnique({ where: { id } });
            if (!existing) return res.status(404).json({ message: 'Entry not found' });

            const isAppOwner = req.user.role?.isAppOwner;
            if (!isAppOwner && existing.createdById !== userId) {
                return res.status(403).json({ message: 'You can only edit your own entries' });
            }

            const entry = await prisma.blacklistEntry.update({
                where: { id },
                data: {
                    ...(phone !== undefined && { phone: phone || null }),
                    ...(licensePlate !== undefined && { licensePlate: licensePlate ? licensePlate.toUpperCase() : null }),
                    ...(name !== undefined && { name: name || null }),
                    ...(description !== undefined && { description }),
                    ...(severity !== undefined && { severity })
                },
                include: { reports: true }
            });

            res.json(entry);
        } catch (error) {
            logger.error('Blacklist update error:', error);
            res.status(500).json({ message: 'Failed to update entry' });
        }
    }

    /** Delete own blacklist entry (or admin) */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.user;

            const existing = await prisma.blacklistEntry.findUnique({ where: { id } });
            if (!existing) return res.status(404).json({ message: 'Entry not found' });

            const isAppOwner = req.user.role?.isAppOwner;
            if (!isAppOwner && existing.createdById !== userId) {
                return res.status(403).json({ message: 'You can only delete your own entries' });
            }

            await prisma.blacklistEntry.delete({ where: { id } });
            res.json({ ok: true });
        } catch (error) {
            logger.error('Blacklist delete error:', error);
            res.status(500).json({ message: 'Failed to delete entry' });
        }
    }

    /** Report/confirm an existing entry from another agency */
    async report(req, res) {
        try {
            const { id } = req.params;
            const { comment } = req.body;
            const { userId, agencyId } = req.user;

            const entry = await prisma.blacklistEntry.findUnique({ where: { id } });
            if (!entry) return res.status(404).json({ message: 'Entry not found' });

            const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

            const report = await prisma.blacklistReport.upsert({
                where: { entryId_agencyId: { entryId: id, agencyId } },
                create: {
                    entryId: id,
                    reportedById: userId,
                    reportedByName: user?.name || 'Unknown',
                    agencyId,
                    comment: comment || null
                },
                update: {
                    reportedById: userId,
                    reportedByName: user?.name || 'Unknown',
                    comment: comment || null
                }
            });

            res.json(report);
        } catch (error) {
            logger.error('Blacklist report error:', error);
            res.status(500).json({ message: 'Failed to report entry' });
        }
    }

    /** Quick check: is this phone number blacklisted? */
    async check(req, res) {
        try {
            const { phone } = req.query;
            if (!phone) return res.status(400).json({ message: 'Phone number is required' });

            const entry = await prisma.blacklistEntry.findFirst({
                where: { phone },
                include: { reports: { select: { agencyId: true } } }
            });

            if (!entry) return res.json({ blacklisted: false });

            res.json({
                blacklisted: true,
                severity: entry.severity,
                name: entry.name,
                description: entry.description,
                reportCount: entry.reports.length + 1
            });
        } catch (error) {
            logger.error('Blacklist check error:', error);
            res.status(500).json({ message: 'Failed to check blacklist' });
        }
    }
}

module.exports = new BlacklistController();
