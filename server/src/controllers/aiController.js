const prisma = require('../services/db');
const aiService = require('../services/aiService');

// POST /api/ai/suggest-reply — AI-powered reply suggestions
exports.suggestReply = async (req, res) => {
  try {
    const { messageText, chatId, profileId, lang, history = [] } = req.body;
    if (!messageText) return res.status(400).json({ message: 'messageText is required' });

    // Load profile context and style examples
    let profileContext = "";
    let styleExamples = [];
    let agencyContext = "";

    if (profileId) {
      const profile = await prisma.profile.findUnique({ 
        where: { id: profileId }, 
        include: { agency: true } 
      });
      if (profile) {
        const data = typeof profile.data === 'string' ? JSON.parse(profile.data) : (profile.data || {});
        profileContext = data.biography || "";
        styleExamples = data.styleExamples || [];
        agencyContext = profile.agency?.extraFeatures || "";
      }
    }

    // Prepare messages for AI (ensure role/content format)
    const formattedHistory = history.map(h => ({
      role: h.direction === 'INBOUND' ? 'user' : 'assistant',
      content: h.text
    }));
    
    // Add the latest message if not in history
    if (formattedHistory.length === 0 || formattedHistory[formattedHistory.length - 1].content !== messageText) {
      formattedHistory.push({ role: 'user', content: messageText });
    }

    try {
      // 1. ATTEMPT REAL AI CALL (Ollama)
      const suggestions = await aiService.suggestReply(
        formattedHistory,
        profileContext,
        styleExamples,
        agencyContext
      );

      return res.json({
        suggestions: suggestions.slice(0, 3),
        source: 'ai',
        model: aiService.model
      });
    } catch (aiError) {
      console.warn('[AI Controller] Falling back to templates due to service error:', aiError.message);
      
      // 2. FALLBACK TO TEMPLATES
      const isCz = lang === 'cz' || lang === 'cs';
      const lower = messageText.toLowerCase();
      let suggestions = [];

      if (lower.includes('price') || lower.includes('cost') || lower.includes('cena') || lower.includes('kolik')) {
        suggestions = isCz ? ['Moje sazby najdete na mém profilu.', 'Ceny se liší podle služby. Co vás zajímá?'] : ['Check my rates on my profile.', 'Prices vary by service. What are you looking for?'];
      } else {
        suggestions = isCz ? ['Děkuji za zprávu! Jak mohu pomoci?', 'Díky za kontakt.'] : ['Thank you for your message!', 'Thanks for reaching out.'];
      }

      return res.json({
        suggestions: suggestions.slice(0, 3),
        source: 'template_fallback',
        model: null
      });
    }
  } catch (error) {
    console.error('AI suggest error:', error);
    res.status(500).json({ message: 'Failed to generate suggestions' });
  }
};

// POST /api/ai/test — Test AI connectivity
exports.testAI = async (req, res) => {
  try {
    const { prompt, system } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    const response = await aiService.generateResponse(prompt, system);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/ai/translate — Translate text
exports.translate = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });

    const response = await aiService.translateText(text, targetLang);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
