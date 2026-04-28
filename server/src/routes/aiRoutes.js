const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authenticateToken = require('../middleware/authMiddleware');

const prisma = require('../services/db');

/**
 * @route POST /api/ai/test
 * @desc Test AI connectivity
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { prompt, system } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const response = await aiService.generateResponse(prompt, system);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/ai/suggest
 * @desc Suggest a reply based on context
 */
router.post('/suggest', authenticateToken, async (req, res) => {
  try {
    const { messages, profileId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let profileContext = "";
    if (profileId) {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { bio: true, description: true, name: true }
      });
      if (profile) {
        profileContext = `Slečna se jmenuje ${profile.name}. Bio: ${profile.bio || ""}. Popis: ${profile.description || ""}`;
      }
    }

    const response = await aiService.suggestReply(messages, profileContext);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
