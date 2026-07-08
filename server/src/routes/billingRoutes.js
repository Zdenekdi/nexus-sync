const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authenticateToken = require('../middleware/authMiddleware');

/**
 * @route POST /api/billing/checkout
 * @desc Create a mock checkout session
 */
router.post('/checkout', authenticateToken, (req, res) => billingController.createCheckoutSession(req, res));

/**
 * @route POST /api/billing/simulate-success
 * @desc Helper to manually trigger automation for a session
 */
router.post('/simulate-success', authenticateToken, (req, res) => billingController.simulateSuccess(req, res));

module.exports = router;
