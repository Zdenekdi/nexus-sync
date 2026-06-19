const prisma = require('../services/db');
const logger = require('../services/logger');

class CallController {
  /**
   * POST /api/calls/log
   * Create a call log entry. Called by SIP controller or relay device.
   */
  async createLog(req, res) {
    try {
      const { profileId, from, duration, status } = req.body;
      if (!profileId || !from) {
        return res.status(400).json({ message: 'profileId and from are required' });
      }

      const log = await prisma.callLog.create({
        data: {
          profileId,
          from,
          duration: parseInt(duration) || 0,
          status: status || 'incoming'
        }
      });

      res.status(201).json(log);
    } catch (err) {
      logger.error('createLog error:', err);
      res.status(500).json({ message: 'Failed to create call log' });
    }
  }

  /**
   * PATCH /api/calls/log/:id
   * Update call log (duration, status) when call ends.
   */
  async updateLog(req, res) {
    try {
      const { id } = req.params;
      const { duration, status } = req.body;

      const log = await prisma.callLog.update({
        where: { id },
        data: {
          ...(duration !== undefined && { duration: parseInt(duration) }),
          ...(status && { status })
        }
      });

      res.json(log);
    } catch (err) {
      logger.error('updateLog error:', err);
      res.status(500).json({ message: 'Failed to update call log' });
    }
  }

  /**
   * GET /api/calls/logs?profileId=xxx&days=7&page=1
   * Fetch call logs for a profile.
   */
  async getLogs(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId } = req.query;
      const days = Math.min(90, parseInt(req.query.days) || 7);
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 30);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        profile: { agencyId },
        createdAt: { gte: startDate },
        ...(profileId && { profileId })
      };

      const [logs, total] = await Promise.all([
        prisma.callLog.findMany({
          where,
          include: { profile: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.callLog.count({ where })
      ]);

      res.json({ logs, total, page });
    } catch (err) {
      logger.error('getLogs error:', err);
      res.status(500).json({ message: 'Failed to fetch call logs' });
    }
  }

  /**
   * GET /api/calls/stats?profileId=xxx&days=7
   * Call statistics for a profile or entire agency.
   */
  async getStats(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const { profileId } = req.query;
      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        profile: { agencyId },
        createdAt: { gte: startDate },
        ...(profileId && { profileId })
      };

      const logs = await prisma.callLog.findMany({ where });

      const totalCalls = logs.length;
      const totalDuration = logs.reduce((s, l) => s + l.duration, 0);
      const completed = logs.filter(l => l.status === 'completed');
      const missed = logs.filter(l => l.status === 'missed');

      res.json({
        totalCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        completedCalls: completed.length,
        missedCalls: missed.length,
        completionRate: totalCalls > 0 ? parseFloat((completed.length / totalCalls * 100).toFixed(1)) : 0
      });
    } catch (err) {
      logger.error('getStats error:', err);
      res.status(500).json({ message: 'Failed to fetch call stats' });
    }
  }

  /**
   * GET /api/calls/operator-metrics?days=7
   * Per-profile call metrics for the agency.
   */
  async getOperatorMetrics(req, res) {
    try {
      const agencyId = req.user?.agencyId;
      if (!agencyId) return res.status(403).json({ message: 'No agency' });

      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const profiles = await prisma.profile.findMany({
        where: { agencyId },
        select: {
          id: true, name: true,
          callLogs: {
            where: { createdAt: { gte: startDate } },
            select: { duration: true, status: true }
          }
        }
      });

      const metrics = profiles.map(p => ({
        profileId: p.id,
        profileName: p.name,
        totalCalls: p.callLogs.length,
        completedCalls: p.callLogs.filter(l => l.status === 'completed').length,
        missedCalls: p.callLogs.filter(l => l.status === 'missed').length,
        totalDuration: p.callLogs.reduce((s, l) => s + l.duration, 0)
      })).sort((a, b) => b.totalCalls - a.totalCalls);

      res.json(metrics);
    } catch (err) {
      logger.error('getOperatorMetrics error:', err);
      res.status(500).json({ message: 'Failed to fetch operator metrics' });
    }
  }

  // ─── WebRTC Signaling (InCallService bridge) ──────────────────────────────
  //
  // Relay telefon zachytí GSM hovor → pošle SDP offer → server přepošle operátorovi
  // Operátor odpoví SDP answer → server přepošle telefonu
  // Oba si vymění ICE kandidáty přes server → přímé WebRTC spojení

  /**
   * POST /api/calls/webrtc/offer
   * Relay telefon odesílá SDP offer na server.
   * Server ho přepošle přes Socket.IO všem operátorům dané agentury.
   */
  async webrtcOffer(req, res) {
    try {
      const { sdp, callerId, agencyId, installationId } = req.body;
      if (!sdp || !agencyId) {
        return res.status(400).json({ message: 'sdp a agencyId jsou povinné' });
      }

      const { getIO } = require('../services/socket');
      const io = getIO();

      // Přepošli offer všem operátorům v dané agentuře
      io.to(`agency:${agencyId}`).emit('call:incoming-gsm', {
        sdp,
        callerId,
        agencyId,
        installationId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`[WebRTC] Offer přijat od relay ${installationId}, přeposlán do agency:${agencyId}`);
      res.json({ ok: true });
    } catch (err) {
      logger.error('webrtcOffer error:', err);
      res.status(500).json({ message: 'Failed to relay WebRTC offer' });
    }
  }

  /**
   * POST /api/calls/webrtc/answer
   * Operátor (prohlížeč) odesílá SDP answer.
   * Server ho přepošle relay telefonu.
   */
  async webrtcAnswer(req, res) {
    try {
      const { sdp, callerId, installationId } = req.body;
      if (!sdp || !installationId) {
        return res.status(400).json({ message: 'sdp a installationId jsou povinné' });
      }

      const { getIO } = require('../services/socket');
      const io = getIO();

      // Přepošli answer relay telefonu (identifikovanému přes installationId room)
      io.to(`relay:${installationId}`).emit('call:webrtc-answer', { sdp, callerId });

      logger.info(`[WebRTC] Answer přeposlán na relay ${installationId}`);
      res.json({ ok: true });
    } catch (err) {
      logger.error('webrtcAnswer error:', err);
      res.status(500).json({ message: 'Failed to relay WebRTC answer' });
    }
  }

  /**
   * POST /api/calls/webrtc/ice
   * ICE kandidát — přeposílá se oběma stranám (phone ↔ browser).
   * Parametr `direction`: 'phone-to-browser' nebo 'browser-to-phone'
   */
  async webrtcIce(req, res) {
    try {
      const { sdpMid, sdpMLineIndex, candidate, direction, agencyId, installationId } = req.body;

      const { getIO } = require('../services/socket');
      const io = getIO();

      if (direction === 'phone-to-browser') {
        // ICE z telefonu → operátor
        io.to(`agency:${agencyId}`).emit('call:ice-candidate', {
          sdpMid, sdpMLineIndex, candidate, from: 'phone',
        });
      } else {
        // ICE z prohlížeče → telefon
        io.to(`relay:${installationId}`).emit('call:ice-candidate', {
          sdpMid, sdpMLineIndex, candidate, from: 'browser',
        });
      }

      res.json({ ok: true });
    } catch (err) {
      logger.error('webrtcIce error:', err);
      res.status(500).json({ message: 'Failed to relay ICE candidate' });
    }
  }

  /**
   * POST /api/calls/webrtc/hangup
   * Ukončení hovoru — notifikuje druhou stranu.
   */
  async webrtcHangup(req, res) {
    try {
      const { agencyId, installationId, initiator } = req.body;

      const { getIO } = require('../services/socket');
      const io = getIO();

      if (initiator === 'browser') {
        io.to(`relay:${installationId}`).emit('call:hangup', { initiator: 'browser' });
      } else {
        io.to(`agency:${agencyId}`).emit('call:hangup', { initiator: 'phone' });
      }

      res.json({ ok: true });
    } catch (err) {
      logger.error('webrtcHangup error:', err);
      res.status(500).json({ message: 'Failed to relay hangup' });
    }
  }
}

module.exports = new CallController();

