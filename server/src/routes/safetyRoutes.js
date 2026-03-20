const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const authenticate = require('../middleware/authMiddleware');

// All safety routes require authentication
router.use(authenticate);

// Session Management
router.post('/sessions', (req, res) => safetyController.createSession(req, res));
router.get('/sessions/active', (req, res) => safetyController.getActiveSession(req, res));
router.get('/sessions/:id', (req, res) => safetyController.getSession(req, res));
router.post('/sessions/:id/check-in', (req, res) => safetyController.checkIn(req, res));
router.post('/sessions/:id/check-out', (req, res) => safetyController.checkOut(req, res));
router.post('/sessions/:id/ack', (req, res) => safetyController.acknowledgeSession(req, res));

// Emergency & Tracking
router.post('/sessions/:id/panic', (req, res) => safetyController.triggerPanic(req, res));
router.post('/sessions/:id/location', (req, res) => safetyController.updateLocation(req, res));

module.exports = router;
