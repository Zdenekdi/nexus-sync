const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticateToken = require('../middleware/authMiddleware');

/**
 * @route POST /api/ai/test
 * @desc Test AI connectivity
 */
router.post('/test', authenticateToken, aiController.testAI);

/**
 * @route POST /api/ai/suggest
 * @desc Suggest a reply based on context
 */
router.post('/suggest', authenticateToken, aiController.suggestReply);

/**
 * @route POST /api/ai/translate
 * @desc Translate text using AI
 */
router.post('/translate', authenticateToken, aiController.translate);

module.exports = router;
