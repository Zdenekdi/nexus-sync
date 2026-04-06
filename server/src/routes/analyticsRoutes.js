const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/daily', (req, res) => ctrl.getDailyStats(req, res));
router.get('/summary', (req, res) => ctrl.getSummary(req, res));
router.post('/generate', (req, res) => ctrl.generateDaily(req, res));

module.exports = router;
