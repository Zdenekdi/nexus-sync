const prisma = require('../services/db');
const logger = require('../services/logger');
const safetyService = require('../services/safetyService');

/**
 * Safety Guard Controller
 */
class SafetyController {

    /** Verify session belongs to the user's agency */
    async _verifySessionAgency(id, req, res) {
        const session = await prisma.safetySession.findUnique({ where: { id }, select: { agencyId: true } });
        if (!session) { res.status(404).json({ message: 'Session not found' }); return null; }
        const { role, agencyId } = req.user || {};
        if (!role?.isAppOwner && session.agencyId !== agencyId) {
            res.status(403).json({ message: 'Access denied' }); return null;
        }
        return session;
    }

    /**
     * Create or Start a Safety Session
     */
    async createSession(req, res) {
        try {
            const { profileId, bookingId, plannedEndAt, graceMinutes = 10, locationType = 'incall' } = req.body;
            const { role, agencyId: userAgencyId } = req.user;
            const isAppOwner = role?.isAppOwner;
            
            let agencyId = userAgencyId;
            if (!agencyId && isAppOwner) {
                const profile = await prisma.profile.findUnique({ where: { id: profileId } });
                agencyId = profile?.agencyId;
            }

            // Verify the target profile belongs to the caller's agency (prevents
            // cross-agency profile disclosure via the session-summary include).
            if (!isAppOwner) {
                const targetProfile = await prisma.profile.findUnique({ where: { id: profileId }, select: { agencyId: true } });
                if (!targetProfile || targetProfile.agencyId !== agencyId) {
                    return res.status(403).json({ message: 'Profile not in your agency' });
                }
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
                    locationType: locationType,
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
            if (!await this._verifySessionAgency(id, req, res)) return;
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
            if (!await this._verifySessionAgency(id, req, res)) return;
            const session = await prisma.safetySession.update({
                where: { id },
                data: { 
                    state: 'GRACE',
                    resolvedAt: null
                },
                include: { profile: true }
            });

            // Notify relay device to start departure check-in timer
            await safetyService.notifyGracePeriodStarted(session);

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
            if (!await this._verifySessionAgency(id, req, res)) return;
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
     * Get a summary of all active/recent safety sessions for the agency.
     * Used for the Safety Guard dashboard.
     */
    async getSessionsSummary(req, res) {
        try {
            const { role, agencyId } = req.user || {};
            const isAppOwner = role?.isAppOwner;

            const sessions = await prisma.safetySession.findMany({
                where: {
                    ...(isAppOwner ? {} : { agencyId }),
                    state: { in: ['CHECKED_IN', 'GRACE', 'ESCALATED'] }
                },
                include: {
                    profile: {
                        // POZOR: Profile NEMÁ pole `image` (fotky žijí v `gallery` jako JSON
                        // s chráněnými URL). Select neexistujícího pole Prisma odmítne
                        // validací → celý endpoint padal na 500 a dohled zůstal prázdný.
                        // Klient si s chybějícím avatarem poradí (fallback na ikonu).
                        select: { id: true, name: true }
                    },
                    locationPoints: {
                        take: 1,
                        orderBy: { capturedAt: 'desc' }
                    },
                    trackerLocations: {
                        take: 1,
                        orderBy: { capturedAt: 'desc' }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            res.json(sessions);
        } catch (error) {
            logger.error('Failed to load sessions summary:', error);
            res.status(500).json({ message: 'Failed to load sessions summary' });
        }
    }

    /**
     * Trigger Panic Alert
     */
    async triggerPanic(req, res) {
        try {
            const { id } = req.params;
            if (!await this._verifySessionAgency(id, req, res)) return;
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
            if (!await this._verifySessionAgency(id, req, res)) return;
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
            if (!await this._verifySessionAgency(id, req, res)) return;
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
    /**
     * Client departure not confirmed in time → escalate
     */
    async departureTimeout(req, res) {
        try {
            const { id } = req.params;
            if (!await this._verifySessionAgency(id, req, res)) return;
            const result = await safetyService.escalateSession(id, 'departure_timeout');
            res.json(result);
        } catch (error) {
            logger.error('Departure timeout escalation failed:', error);
            res.status(500).json({ message: 'Departure timeout escalation failed' });
        }
    }

    /**
     * Model confirmed client has left — safe
     */
    async departureConfirmed(req, res) {
        try {
            const { id } = req.params;
            if (!await this._verifySessionAgency(id, req, res)) return;
            
            const session = await prisma.safetySession.update({
                where: { id },
                data: {
                    state: 'RESOLVED',
                    resolvedAt: new Date()
                }
            });

            logger.info(`Departure confirmed for session ${id}`);
            res.json({ ok: true, sessionId: id, state: session.state });
        } catch (error) {
            res.status(500).json({ message: 'Departure confirmation failed' });
        }
    }

    /**
     * Trigger a Ghost Call (Fake incoming call) for a model
     */
    async triggerGhostCall(req, res) {
        try {
            const { profileId } = req.body;
            const { agencyId } = req.user;
            
            logger.info(`[Ghost Call] Triggered for profile ${profileId} in agency ${agencyId}`);
            
            // In production, this would call safetyService.sendPush(profileId, 'GHOST_CALL')
            res.json({ ok: true, message: 'Ghost call triggered successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to trigger ghost call' });
        }
    }

    /**
     * Get safety settings (Audio Sentinel, etc.) for the agency
     */
    async getSettings(req, res) {
        try {
            const { agencyId } = req.user;
            if (!agencyId) return res.status(400).json({ message: 'Agency context required' });

            const agency = await prisma.agency.findUnique({
                where: { id: agencyId },
                select: { extraFeatures: true }
            });

            const features = JSON.parse(agency.extraFeatures || '{}');
            const safetySettings = features.safetySettings || {
                audioSentinelEnabled: true,
                audioSentinelInterval: 300, // seconds
                audioSentinelVolume: 0.5
            };

            res.json(safetySettings);
        } catch (error) {
            res.status(500).json({ message: 'Failed to load safety settings' });
        }
    }

    /**
     * Update safety settings for the agency
     */
    async updateSettings(req, res) {
        try {
            const { agencyId } = req.user;
            const { audioSentinelEnabled, audioSentinelInterval, audioSentinelVolume } = req.body;

            const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
            const features = JSON.parse(agency.extraFeatures || '{}');
            
            features.safetySettings = {
                audioSentinelEnabled,
                audioSentinelInterval: Number(audioSentinelInterval),
                audioSentinelVolume: Number(audioSentinelVolume)
            };

            await prisma.agency.update({
                where: { id: agencyId },
                data: { extraFeatures: JSON.stringify(features) }
            });

            res.json({ ok: true, settings: features.safetySettings });
        } catch (error) {
            res.status(500).json({ message: 'Failed to update safety settings' });
        }
    }
}

module.exports = new SafetyController();
