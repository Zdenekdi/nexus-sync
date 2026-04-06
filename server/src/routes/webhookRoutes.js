const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Telegram Bot webhook (no auth — Telegram sends updates)
router.post('/telegram', webhookController.handleTelegram);

// WhatsApp Business API webhook (no auth — Meta sends updates)
router.get('/whatsapp', webhookController.verifyWhatsApp);
router.post('/whatsapp', webhookController.handleWhatsApp);

// Generic external webhook (could be authenticated via API key in production)
router.post('/generic', webhookController.handleGeneric);

module.exports = router;
