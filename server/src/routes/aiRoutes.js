const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route POST /api/ai/test
 * @desc Test AI connectivity
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const response = await aiService.generateResponse(prompt);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
