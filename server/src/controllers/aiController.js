const prisma = require('../services/db');

// POST /api/ai/suggest-reply — AI-powered reply suggestions
// Stub: returns template-based suggestions until AI model is connected
exports.suggestReply = async (req, res) => {
  try {
    const { messageText, chatId, profileId, lang } = req.body;
    if (!messageText) return res.status(400).json({ message: 'messageText is required' });

    // Load profile quick replies as context
    let quickReplies = [];
    if (profileId) {
      const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { data: true } });
      if (profile?.data) {
        const data = typeof profile.data === 'string' ? JSON.parse(profile.data) : profile.data;
        quickReplies = data.quickReplies || [];
      }
    }

    // TODO: Replace with actual AI model call (OpenAI, Claude, etc.)
    // For now, return context-aware template suggestions
    const isCz = lang === 'cz' || lang === 'cs';
    const lower = messageText.toLowerCase();

    let suggestions = [];

    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('cena') || lower.includes('kolik')) {
      suggestions = isCz
        ? ['Moje sazby najdete na mém profilu. Mohu vám pomoci s konkrétní službou?', 'Děkuji za váš zájem! Ceny se liší podle služby. Jaký typ schůzky vás zajímá?']
        : ['You can find my rates on my profile. Can I help with a specific service?', 'Thank you for your interest! Prices vary by service. What type of meeting are you looking for?'];
    } else if (lower.includes('available') || lower.includes('free') || lower.includes('when') || lower.includes('volná') || lower.includes('kdy')) {
      suggestions = isCz
        ? ['Jsem k dispozici dnes odpoledne a zítra dopoledne. Vyhovuje vám nějaký čas?', 'Podívám se do kalendáře a dám vám vědět co nejdříve.']
        : ['I\'m available this afternoon and tomorrow morning. Does any time work for you?', 'Let me check my calendar and get back to you shortly.'];
    } else if (lower.includes('location') || lower.includes('where') || lower.includes('address') || lower.includes('kde') || lower.includes('adresa')) {
      suggestions = isCz
        ? ['Nabízím incall i outcall. Jakou variantu preferujete?', 'Detaily lokace sdílím po potvrzení schůzky.']
        : ['I offer both incall and outcall. Which would you prefer?', 'I share location details once the booking is confirmed.'];
    } else if (lower.includes('book') || lower.includes('appointment') || lower.includes('rezerv') || lower.includes('schůz')) {
      suggestions = isCz
        ? ['Ráda vám zarezervuji termín. Jaký den a čas vám vyhovuje?', 'Skvěle! Upřesněte prosím datum, čas a typ schůzky (incall/outcall).']
        : ['I\'d be happy to book you in. What day and time works best?', 'Great! Please specify the date, time, and meeting type (incall/outcall).'];
    } else {
      suggestions = isCz
        ? ['Děkuji za vaši zprávu! Jak vám mohu pomoci?', 'Díky za kontakt. Máte nějaký konkrétní dotaz?']
        : ['Thank you for your message! How can I help you?', 'Thanks for reaching out. Do you have any specific questions?'];
    }

    // Add matching quick replies if any
    if (quickReplies.length > 0) {
      const relevant = quickReplies.filter(qr => {
        const qrLower = (typeof qr === 'string' ? qr : qr.text || '').toLowerCase();
        return lower.split(' ').some(word => word.length > 3 && qrLower.includes(word));
      }).slice(0, 2);
      if (relevant.length > 0) {
        suggestions = [...relevant.map(qr => typeof qr === 'string' ? qr : qr.text), ...suggestions];
      }
    }

    res.json({
      suggestions: suggestions.slice(0, 3),
      source: 'template', // Will be 'ai' once model is connected
      model: null
    });
  } catch (error) {
    console.error('AI suggest error:', error);
    res.status(500).json({ message: 'Failed to generate suggestions' });
  }
};
