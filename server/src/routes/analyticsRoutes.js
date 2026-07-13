const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');
const { requireManager } = require('../utils/authz');

router.use(authMiddleware);
// Finanční statistiky agentury — jen manager+ (Operator/Model dle ROLES.md ne).
router.use(requireManager);

router.get('/daily', (req, res) => ctrl.getDailyStats(req, res));
router.get('/summary', requirePlan(['Professional', 'Agency'], 'advanced_analytics'), (req, res) => ctrl.getSummary(req, res));
router.post('/generate', requirePlan(['Professional', 'Agency'], 'advanced_analytics'), (req, res) => ctrl.generateDaily(req, res));

module.exports = router;
