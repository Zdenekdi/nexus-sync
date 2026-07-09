const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authenticateToken = require('../middleware/authMiddleware');
const { requireAppOwner } = require('../utils/authz');

/**
 * @route POST /api/billing/checkout
 * @desc Create Stripe Checkout session
 */
router.post('/checkout', authenticateToken, (req, res) => billingController.createCheckoutSession(req, res));

/**
 * @route POST /api/billing/portal
 * @desc Create Stripe Billing Portal session
 */
router.post('/portal', authenticateToken, (req, res) => billingController.createPortalSession(req, res));

/**
 * @route POST /api/billing/simulate-success
 * @desc Test/dev-only helper to manually trigger billing automation
 */
router.post('/simulate-success', authenticateToken, requireAppOwner, (req, res) => billingController.simulateSuccess(req, res));

module.exports = router;
