const axios = require('axios');
const logger = require('./logger');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8701634067';

/**
 * Sends a notification to the administrator via Telegram.
 */
const sendAlert = async (message, level = 'error') => {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('Telegram Alert NOT sent: TELEGRAM_BOT_TOKEN is missing in .env');
    return;
  }

  const emoji = level === 'error' ? '🚨' : '⚠️';
  const text = `${emoji} *Nexus Hub Alert* (${level.toUpperCase()})\n\n${message}`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    logger.error('Failed to send Telegram alert:', err.message);
  }
};

module.exports = { sendAlert };
