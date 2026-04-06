const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const deviceController = require('../controllers/deviceController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { registerPushToken, verifyDeviceBinding, revokeDeviceBinding } = require('../middleware/schemas');

// Rate limiter for unauthenticated device endpoints
const deviceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many device requests, please try again later.' }
});

// GoIP uses urlencoded for its POST
router.post('/goip/sms', deviceLimiter, express.urlencoded({ extended: true }), deviceController.handleGoIP);

// Mobile apps usually use JSON
router.post('/mobile/sms', deviceLimiter, express.json(), deviceController.handleMobileSms);
router.post('/mobile/call', deviceLimiter, express.json(), deviceController.handleMobileCall);
// Relay Mode (Nexus Relay APK)
router.post('/relay', deviceLimiter, express.json(), deviceController.handleRelay);
router.post('/push-token', authMiddleware, express.json(), validate(registerPushToken), deviceController.registerPushToken);
router.get('/status', authMiddleware, deviceController.getRelayStatus);
router.post('/verify', authMiddleware, express.json(), validate(verifyDeviceBinding), deviceController.verifyDeviceBinding);
router.post('/push-test', authMiddleware, express.json(), deviceController.sendTestPush);

// Device Management
router.get('/bindings', authMiddleware, deviceController.getDeviceBindings);
router.post('/revoke-binding', authMiddleware, express.json(), validate(revokeDeviceBinding), deviceController.revokeDeviceBinding);

module.exports = router;
