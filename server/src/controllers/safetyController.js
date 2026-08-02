const prisma = require('../services/db');
const logger = require('../services/logger');
const safetyService = require('../services/safetyService');
const { sendGhostCallPush } = require('../services/pushService');

// Stavy, ve kterých je relace "živá" — drží se stejné definice jako trackerController.
const ACTIVE_SESSION_STATES = ['CHECKED_IN', 'GRACE', 'ESCALATED'];

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

            // Modelka má mít nejvýš JEDNU živou relaci. Dřív se při každém startu
            // check-inu založila nová, takže se v dohledu hromadily duplicity téže
            // modelky (a eskalované se nikdy neuzavřely) — mezi nimi by skutečný
            // poplach zapadl. Když už relace běží, jen ji obnovíme.
            const existingActive = await prisma.safetySession.findFirst({
                where: { profileId, state: { in: ACTIVE_SESSION_STATES } },
                orderBy: { createdAt: 'desc' }
            });

            if (existingActive) {
                const refreshed = await prisma.safetySession.update({
                    where: { id: existingActive.id },
                    data: {
                        plannedEndAt: plannedEnd,
                        graceUntil: graceUntil,
                        locationType: locationType,
                        state: 'CHECKED_IN',   // nový check-in ruší i probíhající eskalaci
                        escalatedAt: null,
                        ...(bookingId ? { bookingId } : {})
                    }
                });
                logger.info(`Safety Session refreshed: ${refreshed.id} for profile ${profileId} (was ${existingActive.state})`);
                return res.json(refreshed);
            }

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
    /**
     * Uzavření relace operátorem.
     *
     * Doteď šlo relaci uzavřít jedině potvrzením odchodu od modelky
     * (departure-confirmed). Eskalovaná relace, kterou operátor vyřešil jinak
     * (telefonátem, osobně, planý poplach), tak zůstala viset navždy a plevelila
     * dohled — mezi starými eskalacemi by skutečný poplach zapadl.
     */
    async resolveSession(req, res) {
        try {
            const { id } = req.params;
            if (!await this._verifySessionAgency(id, req, res)) return;

            const session = await prisma.safetySession.update({
                where: { id },
                data: { state: 'RESOLVED', resolvedAt: new Date() }
            });

            logger.info(`Safety Session ${id} resolved by user ${req.user?.userId || 'unknown'}`);
            res.json({ ok: true, sessionId: id, state: session.state });
        } catch (error) {
            logger.error('Error resolving safety session:', error);
            res.status(500).json({ message: 'Failed to resolve session' });
        }
    }

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
            const { role, agencyId: userAgencyId } = req.user || {};
            const isAppOwner = role?.isAppOwner;

            if (!profileId) {
                return res.status(400).json({ message: 'profileId is required' });
            }

            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                select: { id: true, name: true, agencyId: true }
            });
            if (!profile) return res.status(404).json({ message: 'Profile not found' });
            if (!isAppOwner && profile.agencyId !== userAgencyId) {
                return res.status(403).json({ message: 'Profile not in your agency' });
            }

            // Doručení do telefonu modelky. Dřív tahle metoda jen zalogovala a vrátila
            // ok:true — operátor viděl „úspěch", ale na telefon nedorazilo nic. U funkce,
            // která má modelce dát záminku k odchodu, je předstíraný úspěch nebezpečný,
            // takže teď hlásíme, jestli se to opravdu podařilo doručit.
            const { getIO, getRoomSize } = require('../services/socket');
            const room = `agency_${profile.agencyId}`;
            // Pozor na význam: emit sám o sobě nic nedokazuje. Hlásíme zvlášť, že se
            // událost odeslala, a kolik klientů je v roomu — víc se ze socketu zjistit
            // nedá (room je celá agentura, ne konkrétní telefon).
            let socketEmitted = false;
            let clientsOnline = 0;
            try {
                getIO().to(room).emit('ghost_call', {
                    profileId: profile.id,
                    profileName: profile.name,
                    triggeredAt: new Date().toISOString()
                });
                socketEmitted = true;
                clientsOnline = getRoomSize(room) || 0;
            } catch (err) {
                logger.warn(`[Ghost Call] Socket emit failed: ${err.message}`);
            }

            // Push MUSÍ mířit na telefon modelky. sendSafetyPush by ho poslal
            // přiřazeným operátorům/manažerům jako nouzový poplach — tedy špatnému
            // publiku i se špatným obsahem.
            let pushDelivered = false;
            try {
                const result = await sendGhostCallPush({
                    agencyId: profile.agencyId,
                    profileId: profile.id,
                    profileName: profile.name
                });
                pushDelivered = (result?.sent ?? 0) > 0;
            } catch (err) {
                logger.warn(`[Ghost Call] Push failed: ${err.message}`);
            }

            logger.info(`[Ghost Call] profile=${profile.id} emitted=${socketEmitted} online=${clientsOnline} push=${pushDelivered}`);

            // Nikdo online a push nedoručen = hovor nikam nedorazil. Operátor to musí vědět.
            if ((!socketEmitted || clientsOnline === 0) && !pushDelivered) {
                return res.status(502).json({
                    ok: false,
                    socketEmitted,
                    clientsOnline,
                    pushDelivered,
                    message: 'Ghost call could not be delivered to the device'
                });
            }

            res.json({ ok: true, socketEmitted, clientsOnline, pushDelivered });
        } catch (error) {
            logger.error('Error triggering ghost call:', error);
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
