const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticateToken = require('../middleware/authMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');

/**
 * @route POST /api/ai/test
 * @desc Test AI connectivity
 */
router.post('/test', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.testAI);
router.post('/suggest', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.suggestReply);
router.post('/translate', authenticateToken, requirePlan(['Professional', 'Agency'], 'ai_features'), aiController.translate);

module.exports = router;
