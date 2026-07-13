const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const authMiddleware = require('../middleware/authMiddleware');

// Telegram Bot webhook (no auth — Telegram sends updates)
router.post('/telegram', webhookController.handleTelegram);

// WhatsApp Business API webhook (no auth — Meta sends updates)
router.get('/whatsapp', webhookController.verifyWhatsApp);
router.post('/whatsapp', webhookController.handleWhatsApp);

// Generic external webhook (could be authenticated via API key in production)
router.post('/generic', webhookController.handleGeneric);

// AdultWork (AW) webhook
router.post('/adultwork', webhookController.handleAdultWork);

// Authenticated: an agency admin/manager fetches their per-agency webhook secret + URLs
router.get('/config', authMiddleware, webhookController.getMyWebhookConfig);

module.exports = router;
