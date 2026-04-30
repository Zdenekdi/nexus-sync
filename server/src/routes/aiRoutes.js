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
    let agencyContext = "";
    let styleExamples = [];

    if (profileId) {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: { agency: true }
      });
      
      if (profile) {
        profileContext = `Jméno: ${profile.name}\nBio: ${profile.bio || "Není uvedeno"}\nOsobnost/Popis: ${profile.description || "Přirozená a milá"}`;
        
        if (profile.agency?.aiInstructions) {
          agencyContext = profile.agency.aiInstructions;
        }
        
        if (profile.sampleMessages) {
          styleExamples.push(...profile.sampleMessages.split('\n').filter(s => s.trim()));
        }
        
        // Fetch last 10 outbound messages for dynamic style learning
        const recentMessages = await prisma.message.findMany({
          where: {
            direction: 'OUTBOUND',
            chat: { profileId: profileId }
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { text: true }
        });
        const dynamicStyle = recentMessages.map(m => m.text);
        styleExamples = [...new Set([...styleExamples, ...dynamicStyle])];
      }
    }

    const response = await aiService.suggestReply(messages, profileContext, styleExamples, agencyContext);
    res.json({ response });
  } catch (error) {
    logger.error(`AI Suggest Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
