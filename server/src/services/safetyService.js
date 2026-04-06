const prisma = require('./db');
const logger = require('./logger');
const { getIO } = require('./socket');
const { sendAlert } = require('./alertService');
const { sendSafetyPush } = require('./pushService');

class SafetyService {
    /**
     * Start the background worker that checks for expired grace periods
     */
    startEscalationWorker() {
        logger.info('Starting Safety Escalation Worker...');
        setInterval(async () => {
            try {
                const now = new Date();
                // Find sessions in CHECKED_IN or GRACE that passed their grace period
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
        }, 30000); // Check every 30 seconds
    }

    /**
     * Escalate a session and notify relevant parties
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

            // 1. Notify Dashboard via Socket.io (Agency-wide room)
            const io = getIO();
            io.to(`agency_${session.agencyId}`).emit('emergency_alert', {
                sessionId,
                profileName: session.profile.name,
                type,
                timestamp: event.createdAt
            });

            // 2. Notify Admin via Telegram
            const message = `🚨 EMERGENCY: Safety Session ${sessionId} ESCALATED!
Profile: ${session.profile.name} (${session.profile.id})
Agency: ${session.profile.agency.name}
Type: ${type.toUpperCase()}`;
            
            await sendAlert(message, 'error');

            // 3. Notify via Granular FCM Push
            await sendSafetyPush({
                agencyId: session.agencyId,
                sessionId: session.id,
                profileId: session.profileId,
                profileName: session.profile.name,
                type
            });

            logger.warn(`Session ${sessionId} successfully ESCALATED and notified.`);
            return { session, event };
        } catch (error) {
            logger.error(`Failed to escalate session ${sessionId}:`, error);
        }
    }
}

module.exports = new SafetyService();
