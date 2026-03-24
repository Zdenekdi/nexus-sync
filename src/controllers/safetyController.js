const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../services/logger');
const safetyService = require('../services/safetyService');

/**
 * Safety Guard Controller
 */
class SafetyController {
    /**
     * Create or Start a Safety Session
     */
    async createSession(req, res) {
        try {
            const { profileId, bookingId, plannedEndAt, graceMinutes = 10 } = req.body;
            const { role, agencyId: userAgencyId } = req.user;
            const isAppOwner = role?.isAppOwner;
            
            let agencyId = userAgencyId;
            if (!agencyId && isAppOwner) {
                const profile = await prisma.profile.findUnique({ where: { id: profileId } });
                agencyId = profile?.agencyId;
            }

            // Calculate grace period
            const plannedEnd = plannedEndAt ? new Date(plannedEndAt) : new Date(Date.now() + 3600000);
            const graceUntil = new Date(plannedEnd.getTime() + graceMinutes * 60000);

            const session = await prisma.safetySession.create({
                data: {
                    profileId,
                    bookingId,
                    agencyId,
                    plannedEndAt: plannedEnd,
                    graceUntil: graceUntil,
                    state: 'CHECKED_IN'
                }
            });

            logger.info(`Safety Session started: ${session.id} for profile ${profileId}`);
            res.status(201).json(session);
        } catch (error) {
            logger.error('Error creating safety session:', error);
            res.status(500).json({ message: 'Failed to create safety session' });
        }
    }

    /**
     * Check-in to an existing session
     */
    async checkIn(req, res) {
        try {
            const { id } = req.params;
            const session = await prisma.safetySession.update({
                where: { id },
                data: { state: 'CHECKED_IN' }
            });
            res.json(session);
        } catch (error) {
            res.status(500).json({ message: 'Check-in failed' });
        }
    }

    /**
     * Check-out and resolve session
     */
    async checkOut(req, res) {
        try {
            const { id } = req.params;
            const session = await prisma.safetySession.update({
                where: { id },
                data: { 
                    state: 'RESOLVED',
                    resolvedAt: new Date()
                }
            });
            res.json(session);
        } catch (error) {
            res.status(500).json({ message: 'Check-out failed' });
        }
    }

    /**
     * Manual model acknowledgement ("I'm OK") to postpone escalation window.
     */
    async acknowledgeSession(req, res) {
        try {
            const { id } = req.params;
            const { extendMinutes = 10 } = req.body || {};

            const existing = await prisma.safetySession.findUnique({ where: { id } });
            if (!existing) {
                return res.status(404).json({ message: 'Session not found' });
            }
            if (existing.state === 'RESOLVED') {
                return res.status(409).json({ message: 'Session is already resolved' });
            }

            const nextGraceUntil = new Date(Date.now() + Number(extendMinutes || 10) * 60000);
            const session = await prisma.safetySession.update({
                where: { id },
                data: {
                    state: 'CHECKED_IN',
                    graceUntil: nextGraceUntil,
                }
            });

            logger.info(`Safety Session acknowledged: ${session.id}, graceUntil=${nextGraceUntil.toISOString()}`);
            res.json(session);
        } catch (error) {
            logger.error('Acknowledge failed:', error);
            res.status(500).json({ message: 'Acknowledge failed' });
        }
    }

    /**
     * Return latest active safety session for currently authenticated agency.
     */
    async getActiveSession(req, res) {
        try {
            const { role, agencyId } = req.user || {};
            const isAppOwner = role?.isAppOwner;
            
            const session = await prisma.safetySession.findFirst({
                where: {
                    ...(isAppOwner ? {} : { agencyId }),
                    state: { in: ['CHECKED_IN', 'GRACE', 'ESCALATED'] }
                },
                orderBy: { updatedAt: 'desc' }
            });

            if (!session) {
                return res.status(404).json({ message: 'No active safety session' });
            }

            return res.json(session);
        } catch (error) {
            logger.error('Failed to load active safety session:', error);
            return res.status(500).json({ message: 'Failed to load active safety session' });
        }
    }

    /**
     * Trigger Panic Alert
     */
    async triggerPanic(req, res) {
        try {
            const { id } = req.params;
            const result = await safetyService.escalateSession(id, 'panic');
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: 'Panic trigger failed' });
        }
    }

    /**
     * Store Location Point
     */
    async updateLocation(req, res) {
        try {
            const { id } = req.params;
            const { lat, lng, accuracy, capturedAt } = req.body;

            const point = await prisma.safetyLocationPoint.create({
                data: {
                    sessionId: id,
                    lat,
                    lng,
                    accuracy,
                    capturedAt: new Date(capturedAt)
                }
            });

            res.status(201).json(point);
        } catch (error) {
            res.status(500).json({ message: 'Location update failed' });
        }
    }

    /**
     * Get Session Status
     */
    async getSession(req, res) {
        try {
            const { id } = req.params;
            const session = await prisma.safetySession.findUnique({
                where: { id },
                include: {
                    locationPoints: { take: 10, orderBy: { capturedAt: 'desc' } },
                    emergencyEvents: true
                }
            });
            
            if (!session) return res.status(404).json({ message: 'Session not found' });
            res.json(session);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch session' });
        }
    }
}

module.exports = new SafetyController();
