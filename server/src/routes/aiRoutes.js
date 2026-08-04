const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticateToken = require('../middleware/authMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');

/**
 * @route POST /api/ai/test
 * @desc Test AI connectivity
 */
router.get('/status', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.status);
router.post('/test', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.testAI);
router.post('/suggest', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.suggestReply);
// Audit návrhů. Bez zápisu výsledku není z čeho počítat schvalovací poměr.
router.patch('/suggestions/:id/outcome', authenticateToken, aiController.recordOutcome);
router.get('/suggestions/stats', authenticateToken, aiController.suggestionStats);

router.post('/translate', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.translate);

module.exports = router;
