const prisma = require('./db');
const logger = require('./logger');
const { getIO } = require('./socket');
const { sendAlert } = require('./alertService');
const { sendSafetyPush } = require('./pushService');

class SafetyService {
    /**
     * Start the background worker that checks for expired grace periods.
     * When a SafetySession grace period expires → escalate AND auto-create SOS alert.
     */
    startEscalationWorker() {
        logger.info('Starting Safety Escalation Worker...');
        setInterval(async () => {
            try {
                const now = new Date();
                const expiredSessions = await prisma.safetySession.findMany({
                    where: {
                        state: { in: ['CHECKED_IN', 'GRACE'] },
                        graceUntil: { lt: now }
                    },
                    include: { profile: true }
                });

                for (const session of expiredSessions) {
                    await this.escalateSession(session.id, 'timeout');
                }
            } catch (error) {
                logger.error('Safety Worker Error:', error);
            }
        }, 30000);
    }

    /**
     * Escalate a session and notify relevant parties.
     * Also creates a linked SOS alert so both systems stay in sync.
     */
    async escalateSession(sessionId, type = 'timeout') {
        try {
            const session = await prisma.safetySession.update({
                where: { id: sessionId },
                data: {
                    state: 'ESCALATED',
                    escalatedAt: new Date()
                },
                include: { 
                    profile: {
                        include: { agency: true }
                    }
                }
            });

            const event = await prisma.emergencyEvent.create({
                data: {
                    sessionId,
                    type,
                    severity: 'critical'
                }
            });

            // Create emergency receipts for all managers in the agency
            try {
                const managers = await prisma.user.findMany({
                    where: {
                        agencyId: session.agencyId,
                        role: { isManager: true }
                    },
                    select: { id: true, role: { select: { name: true } } }
                });

                for (const mgr of managers) {
                    await prisma.emergencyReceipt.create({
                        data: {
                            eventId: event.id,
                            recipientId: mgr.id,
                            recipientRole: mgr.role?.name || 'Manager'
                        }
                    });
                }
                logger.info(`Created ${managers.length} emergency receipts for event ${event.id}`);
            } catch (receiptErr) {
                logger.warn('Failed to create emergency receipts:', receiptErr.message);
            }

            // Bridge: auto-create SOS alert linked to this session
            let sosAlert = null;
            try {
                // Get last known location from safety session
                const lastLocation = await prisma.safetyLocationPoint.findFirst({
                    where: { sessionId },
                    orderBy: { capturedAt: 'desc' }
                });

                // Find user assigned to this profile
                const profileUser = await prisma.user.findFirst({
                    where: {
                        assignedProfiles: { some: { id: session.profileId } }
                    },
                    select: { id: true }
                });

                sosAlert = await prisma.sOSAlert.create({
                    data: {
                        agencyId: session.agencyId,
                        profileId: session.profileId,
                        userId: profileUser?.id || 'system',
                        type: `session_${type}`,
                        lat: lastLocation?.lat || null,
                        lng: lastLocation?.lng || null,
                        accuracy: lastLocation?.accuracy || null
                    }
                });
                logger.info(`SOS Alert ${sosAlert.id} auto-created from SafetySession ${sessionId}`);
            } catch (sosErr) {
                logger.warn(`Failed to create bridged SOS alert for session ${sessionId}:`, sosErr.message);
            }

            // 1. Notify Dashboard via Socket.io (Agency-wide room)
            const io = getIO();
            io.to(`agency_${session.agencyId}`).emit('emergency_alert', {
                sessionId,
                profileName: session.profile.name,
                type,
                timestamp: event.createdAt
            });

            // Also emit sos_triggered so SOSPanel picks it up
            if (sosAlert) {
                io.to(`agency_${session.agencyId}`).emit('sos_triggered', {
                    alertId: sosAlert.id,
                    type: `session_${type}`,
                    userName: session.profile.name,
                    userId: sosAlert.userId,
                    lat: sosAlert.lat,
                    lng: sosAlert.lng,
                    timestamp: sosAlert.createdAt,
                    linkedSessionId: sessionId
                });
            }

            // 2. Notify relay device to start GPS tracking
            io.to(`agency_${session.agencyId}`).emit('safety_grace_expired', {
                sessionId,
                profileId: session.profileId,
                profileName: session.profile.name,
                sosAlertId: sosAlert?.id || null,
                type
            });

            // 3. Notify Admin via Telegram
            const message = `🚨 EMERGENCY: Safety Session ${sessionId} ESCALATED!
Profile: ${session.profile.name} (${session.profile.id})
Agency: ${session.profile.agency.name}
Type: ${type.toUpperCase()}`;
            
            await sendAlert(message, 'error');

            // 4. Notify via Granular FCM Push
            await sendSafetyPush({
                agencyId: session.agencyId,
                sessionId: session.id,
                profileId: session.profileId,
                profileName: session.profile.name,
                type
            });

            logger.warn(`Session ${sessionId} successfully ESCALATED and notified.`);
            return { session, event, sosAlert };
        } catch (error) {
            logger.error(`Failed to escalate session ${sessionId}:`, error);
        }
    }

    /**
     * Notify relay device when grace period is about to start.
     * Emits socket event so RelayMode auto-starts check-in timer.
     */
    async notifyGracePeriodStarted(session) {
        try {
            const io = getIO();
            io.to(`agency_${session.agencyId}`).emit('safety_grace_started', {
                sessionId: session.id,
                profileId: session.profileId,
                graceUntil: session.graceUntil,
                graceMinutes: Math.round((new Date(session.graceUntil) - Date.now()) / 60000)
            });
        } catch (e) {
            logger.warn('Failed to notify grace period start:', e.message);
        }
    }
}

module.exports = new SafetyService();
