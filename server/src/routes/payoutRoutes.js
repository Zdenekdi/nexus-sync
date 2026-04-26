const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/summary', authMiddleware, payoutController.getPayoutSummary);
router.get('/export', authMiddleware, payoutController.exportPayouts);

module.exports = router;
