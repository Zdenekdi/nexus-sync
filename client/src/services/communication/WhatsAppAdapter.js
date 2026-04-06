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
      // Initialize WhatsApp Business API client
      this.isConnected = true;
      return { success: true, channel: 'whatsapp' };
    } catch (error) {
      console.error('WhatsApp connection failed:', error);
      this.isConnected = false;
      throw error;
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
      // Queue message for sending
      const messageId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.messageQueue.push({
        id: messageId,
        message: formatted,
        status: 'pending'
      });

      // In production, send via WhatsApp Business API
      // const response = await axios.post(
      //   `https://graph.instagram.com/v18.0/${this.config.phoneNumberId}/messages`,
      //   formatted,
      //   { headers: { Authorization: `Bearer ${this.config.apiKey}` } }
      // );

      return {
        id: messageId,
        status: 'queued',
        timestamp: new Date(),
        channel: 'whatsapp'
      };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
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
      } catch (error) {
        console.error('Webhook handler error:', error);
      }
    }
  }
}

export default WhatsAppAdapter;
