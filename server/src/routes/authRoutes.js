const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/register-agency', authController.registerAgency);
router.post('/register-user', authController.registerUser);
router.post('/reset-password-request', authController.resetPasswordRequest);
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;
