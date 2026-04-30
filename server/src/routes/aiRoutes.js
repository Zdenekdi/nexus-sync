const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const logger = require('../services/logger');
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
    logger.error(`AI Test Error: ${error.message}`);
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
    let styleExamples = [];

    if (profileId) {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: { agency: true }
      });
      
      if (profile) {
        profileContext = `Slečna se jmenuje ${profile.name}. Bio: ${profile.bio || ""}. Popis: ${profile.description || ""}`;
        
        if (profile.agency?.aiInstructions) {
          profileContext += `\nSTRATEGIE AGENTURY:\n${profile.agency.aiInstructions}`;
        }
        
        if (profile.sampleMessages) {
          profileContext += `\nMANUÁLNĚ VLOŽENÉ UKÁZKY STYLU (VELMI DŮLEŽITÉ):\n${profile.sampleMessages}`;
        }
        
        // Fetch last 10 outbound messages for better style learning (increased from 5)
        const recentMessages = await prisma.message.findMany({
          where: {
            direction: 'OUTBOUND',
            chat: { profileId: profileId }
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { text: true }
        });
        styleExamples = recentMessages.map(m => m.text);
      }
    }

    const response = await aiService.suggestReply(messages, profileContext, styleExamples);
    res.json({ response });
  } catch (error) {
    logger.error(`AI Suggest Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
