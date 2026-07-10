const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/callController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createCallLog, updateCallLog } = require('../middleware/schemas');

router.use(authMiddleware);

router.post('/log', validate(createCallLog), (req, res) => ctrl.createLog(req, res));
router.patch('/log/:id', validate(updateCallLog), (req, res) => ctrl.updateLog(req, res));
router.get('/logs', (req, res) => ctrl.getLogs(req, res));
router.get('/stats', (req, res) => ctrl.getStats(req, res));
router.get('/operator-metrics', (req, res) => ctrl.getOperatorMetrics(req, res));

// ── WebRTC Signaling (InCallService — GSM bez SIP Trunk) ──────────────────────
// Relay telefon (NexusInCallService) ↔ Server ↔ Prohlížeč operátora
router.post('/webrtc/offer',  (req, res) => ctrl.webrtcOffer(req, res));
router.post('/webrtc/answer', (req, res) => ctrl.webrtcAnswer(req, res));
router.post('/webrtc/ice',    (req, res) => ctrl.webrtcIce(req, res));
router.post('/webrtc/hangup', (req, res) => ctrl.webrtcHangup(req, res));

module.exports = router;
