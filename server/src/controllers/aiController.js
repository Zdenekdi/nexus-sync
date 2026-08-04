const prisma = require('../services/db');
const { isManagerRole } = require('../utils/authz');
const aiService = require('../services/aiService');

// GET /api/ai/status — Check AI/Ollama connectivity

/**
 * Zaznamená vygenerovaný návrh, aby se dalo zjistit, co s ním operátorka
 * udělala. Bez tohohle záznamu není z čeho počítat schvalovací poměr.
 *
 * Selhání zápisu nesmí shodit generování návrhu — návrh je hlavní věc,
 * statistika nadstavba.
 */
async function recordSuggestion({ agencyId, profileId, chatId, source, model }) {
  if (!agencyId) return null;
  try {
    const row = await prisma.aiSuggestion.create({
      data: {
        agencyId: String(agencyId),
        profileId: profileId ? String(profileId) : null,
        chatId: chatId ? String(chatId) : null,
        source,
        model: model || null
      }
    });
    return row.id;
  } catch (error) {
    console.warn('[AI] Nepodařilo se zaznamenat návrh:', error.message);
    return null;
  }
}

exports.status = async (_req, res) => {
  const status = await aiService.healthCheck({ includeInternal: false });
  res.status(status.ok ? 200 : 503).json(status);
};

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

    // Prepare messages for AI (accept both {direction,text} and {role,content})
    const formattedHistory = history
      .map(h => ({
        role: h.role || (h.direction === 'INBOUND' ? 'user' : 'assistant'),
        content: h.content || h.text || ''
      }))
      .filter(h => h.content.trim().length > 0);
    
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

      const suggestionId = await recordSuggestion({
        agencyId: req.user?.agencyId, profileId, chatId, source: 'ai', model: aiService.model
      });

      return res.json({
        suggestions: suggestions.slice(0, 3),
        source: 'ai',
        model: aiService.model,
        suggestionId
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

      // Šablonová odpověď se zaznamenává taky, ale se source
      // 'template_fallback' — do poměru o kvalitě modelu se nesmí počítat.
      const suggestionId = await recordSuggestion({
        agencyId: req.user?.agencyId, profileId, chatId, source: 'template_fallback', model: null
      });

      return res.json({
        suggestions: suggestions.slice(0, 3),
        source: 'template_fallback',
        model: null,
        suggestionId
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
    console.error("[AI Security] Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/ai/translate — Translate text
exports.translate = async (req, res) => {
  try {
    const { text, target } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });

    const response = await aiService.translateText(text, target);
    res.json({ translated: response });
  } catch (error) {
    console.error("[AI Security] Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const OUTCOMES = ['SENT', 'EDITED', 'DISCARDED'];

/**
 * PATCH /api/ai/suggestions/:id/outcome
 *
 * Operátorka hlásí, co s návrhem udělala. Bez tohohle kroku zůstane návrh
 * PENDING a do poměru se nezapočítá — což je správně: nerozhodnuté návrhy
 * nejsou ani schválené, ani zamítnuté.
 */
exports.recordOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, messageId } = req.body;
    const agencyId = req.user?.agencyId;
    const operatorId = req.user?.userId || req.user?.id;

    if (!OUTCOMES.includes(outcome)) {
      return res.status(400).json({ message: `outcome musí být jedno z: ${OUTCOMES.join(', ')}` });
    }

    const existing = await prisma.aiSuggestion.findUnique({ where: { id: String(id) } });
    if (!existing || existing.agencyId !== agencyId) {
      return res.status(404).json({ message: 'Návrh nenalezen' });
    }
    // Jednou rozhodnutý návrh se nepřepisuje — jinak by šlo poměr měnit zpětně.
    if (existing.outcome !== 'PENDING') {
      return res.status(409).json({ message: 'O návrhu už bylo rozhodnuto', outcome: existing.outcome });
    }

    const updated = await prisma.aiSuggestion.update({
      where: { id: String(id) },
      data: {
        outcome,
        operatorId: operatorId ? String(operatorId) : null,
        messageId: messageId ? String(messageId) : null,
        decidedAt: new Date()
      }
    });
    return res.json({ id: updated.id, outcome: updated.outcome });
  } catch (error) {
    console.error('[AI] recordOutcome failed:', error.message);
    return res.status(500).json({ message: 'Nepodařilo se uložit výsledek' });
  }
};

/**
 * GET /api/ai/suggestions/stats?days=7
 *
 * Kolik návrhů a jak dopadly. Jen pro vedoucí role — je to podklad k hodnocení
 * práce operátorek, ne provozní údaj.
 *
 * POMĚRY JSOU DEFINOVANÉ VÝSLOVNĚ, protože „schvalovací poměr" může znamenat
 * dvě různé věci a číslo bez definice se špatně vykládá:
 *
 *   approvalRate = SENT / rozhodnuté          … prošlo beze změny
 *   usageRate    = (SENT + EDITED) / rozhodnuté … použito, byť s úpravou
 *
 * Do obou se počítají jen návrhy se source 'ai'. Šablonové odpovědi
 * o kvalitě modelu nevypovídají.
 */
exports.suggestionStats = async (req, res) => {
  try {
    const agencyId = req.user?.agencyId;
    if (!agencyId) return res.status(403).json({ message: 'No agency' });
    if (!isManagerRole(req.user?.role)) {
      return res.status(403).json({ message: 'Statistika AI je přístupná jen vedoucím rolím.' });
    }

    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
    const since = new Date(Date.now() - days * 86400000);

    const rows = await prisma.aiSuggestion.groupBy({
      by: ['outcome'],
      where: { agencyId, source: 'ai', createdAt: { gte: since } },
      _count: { _all: true }
    });

    const count = (name) => rows.find(r => r.outcome === name)?._count?._all || 0;
    const sent = count('SENT');
    const edited = count('EDITED');
    const discarded = count('DISCARDED');
    const pending = count('PENDING');
    const decided = sent + edited + discarded;

    return res.json({
      days,
      generated: decided + pending,
      pending,
      sent,
      edited,
      discarded,
      decided,
      // null, ne 0 — nula by tvrdila, že model selhává, i když se jen zatím
      // nic nerozhodlo.
      approvalRate: decided ? Math.round((sent / decided) * 100) : null,
      usageRate: decided ? Math.round(((sent + edited) / decided) * 100) : null
    });
  } catch (error) {
    console.error('[AI] suggestionStats failed:', error.message);
    return res.status(500).json({ message: 'Nepodařilo se spočítat statistiku' });
  }
};
