const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createSafetySession, safetyLocation } = require('../middleware/schemas');

router.use(authMiddleware);

// Session Management
router.post('/sessions', validate(createSafetySession), (req, res) => safetyController.createSession(req, res));
router.get('/sessions/active', (req, res) => safetyController.getActiveSession(req, res));
router.get('/sessions/summary', (req, res) => safetyController.getSessionsSummary(req, res));
router.get('/sessions/:id', (req, res) => safetyController.getSession(req, res));
router.post('/sessions/:id/check-in', (req, res) => safetyController.checkIn(req, res));
router.post('/sessions/:id/check-out', (req, res) => safetyController.checkOut(req, res));
router.post('/sessions/:id/ack', (req, res) => safetyController.acknowledgeSession(req, res));

// Emergency & Tracking
router.post('/sessions/:id/panic', (req, res) => safetyController.triggerPanic(req, res));
router.post('/sessions/:id/location', validate(safetyLocation), (req, res) => safetyController.updateLocation(req, res));

// Client Departure
router.post('/sessions/:id/departure-timeout', (req, res) => safetyController.departureTimeout(req, res));
router.post('/sessions/:id/departure-confirmed', (req, res) => safetyController.departureConfirmed(req, res));

// Global Safety Features
router.post('/ghost-call', (req, res) => safetyController.triggerGhostCall(req, res));
router.get('/settings', (req, res) => safetyController.getSettings(req, res));
router.patch('/settings', (req, res) => safetyController.updateSettings(req, res));

module.exports = router;
