const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const authMiddleware = require('../middleware/authMiddleware');

// GoIP uses urlencoded for its POST
router.post('/goip/sms', express.urlencoded({ extended: true }), deviceController.handleGoIP);

// Mobile apps usually use JSON
router.post('/mobile/sms', express.json(), deviceController.handleMobileSms);
router.post('/mobile/call', express.json(), deviceController.handleMobileCall);
// Relay Mode (Nexus Relay APK)
router.post('/relay', express.json(), deviceController.handleRelay);
router.post('/push-token', authMiddleware, express.json(), deviceController.registerPushToken);
router.get('/status', authMiddleware, deviceController.getRelayStatus);
router.post('/verify', authMiddleware, express.json(), deviceController.verifyDeviceBinding);
router.post('/push-test', authMiddleware, express.json(), deviceController.sendTestPush);

module.exports = router;
