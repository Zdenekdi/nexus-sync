/**
 * WhatsAppAdapter - WhatsApp Business API integration
 * Supports message sending, receiving, and conversation management
 */

import ChannelAdapter from './ChannelAdapter';

export class WhatsAppAdapter extends ChannelAdapter {
  constructor(config = {}) {
    super(config);
    this.channelName = 'whatsapp';
    this.webhookHandlers = new Map();
    this.messageQueue = [];
  }

  async connect() {
    try {
      this.validateConfig();
      if (!this.config.sendEndpoint && this.config.allowLocalQueue !== true) {
        throw new Error('WhatsApp sender endpoint is not configured');
      }
      this.isConnected = true;
      return { success: true, channel: 'whatsapp' };
    } catch (_err) {
      console.error('WhatsApp connection failed:', _err);
      this.isConnected = false;
      throw _err;
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.messageQueue = [];
  }

  async send(message) {
    if (!this.isConnected) {
      throw new Error('WhatsApp adapter not connected');
    }

    const formatted = this.formatOutgoing(message);
    
    try {
      if (!this.config.sendEndpoint) {
        throw new Error('WhatsApp sender endpoint is not configured');
      }

      const response = await fetch(this.config.sendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {})
        },
        body: JSON.stringify(formatted)
      });

      if (!response.ok) {
        throw new Error(`WhatsApp send failed: HTTP ${response.status}`);
      }

      const result = await response.json().catch(() => ({}));
      const messageId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.messageQueue.push({
        id: result.id || messageId,
        message: formatted,
        status: result.status || 'sent'
      });

      return {
        id: result.id || messageId,
        status: result.status || 'sent',
        timestamp: new Date(),
        channel: 'whatsapp'
      };
    } catch (_err) {
      console.error('WhatsApp send _err:', _err);
      throw _err;
    }
  }

  async getConversation(conversationId) {
    if (!this.isConnected) {
      throw new Error('WhatsApp adapter not connected');
    }

    // In production, fetch from WhatsApp Business API
    return {
      id: conversationId,
      channel: 'whatsapp',
      messages: [],
      contact: {},
      lastUpdated: new Date()
    };
  }

  async getConversations(contactId) {
    if (!this.isConnected) {
      throw new Error('WhatsApp adapter not connected');
    }

    // In production, fetch from WhatsApp Business API
    return [
      {
        id: `wa_conv_${contactId}`,
        channel: 'whatsapp',
        contact: { id: contactId, name: 'Contact' },
        lastMessage: '',
        lastUpdated: new Date()
      }
    ];
  }

  async getContacts() {
    if (!this.isConnected) {
      return [];
    }

    // In production, fetch from WhatsApp Business API
    return [];
  }

  async markAsRead(messageId, conversationId) {
    // Mark message as read in WhatsApp
    return { success: true, messageId, conversationId };
  }

  async getStats() {
    const baseStats = await super.getStats();
    return {
      ...baseStats,
      channel: 'whatsapp',
      queuedMessages: this.messageQueue.length,
      messagesSent: this.messageQueue.filter(m => m.status === 'sent').length
    };
  }

  formatOutgoing(message) {
    return {
      messaging_product: 'whatsapp',
      to: message.recipient?.phone || message.to,
      type: 'text',
      text: {
        body: message.content || message.text || ''
      },
      recipient_type: 'individual'
    };
  }

  parseIncoming(rawData) {
    // Parse WhatsApp webhook payload
    if (!rawData.entry?.[0]?.changes?.[0]?.value?.messages) {
      return null;
    }

    const msg = rawData.entry[0].changes[0].value.messages[0];
    return {
      id: msg.id,
      from: msg.from,
      timestamp: new Date(msg.timestamp * 1000),
      type: msg.type,
      text: msg.text?.body || '',
      media: msg.image || msg.document || msg.audio || msg.video || null
    };
  }

  /**
   * Register webhook handler for incoming messages
   */
  registerWebhookHandler(handler) {
    const id = `wh_${Date.now()}`;
    this.webhookHandlers.set(id, handler);
    return id;
  }

  /**
   * Remove webhook handler
   */
  removeWebhookHandler(id) {
    this.webhookHandlers.delete(id);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload) {
    const handlers = Array.from(this.webhookHandlers.values());
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (_err) {
        console.error('Webhook handler _err:', _err);
      }
    }
  }
}

export default WhatsAppAdapter;
