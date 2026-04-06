const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { login, registerAgency, registerUser, resetPasswordRequest } = require('../middleware/schemas');

router.post('/login', validate(login), authController.login);
router.post('/register-agency', validate(registerAgency), authController.registerAgency);
router.post('/register-user', validate(registerUser), authController.registerUser);
router.post('/reset-password-request', validate(resetPasswordRequest), authController.resetPasswordRequest);
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;
