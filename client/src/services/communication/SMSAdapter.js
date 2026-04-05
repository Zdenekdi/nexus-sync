/**
 * SMSAdapter - SMS Gateway integration (Twilio, Amazon SNS, etc.)
 * Supports message sending and receiving via SMS
 */

import ChannelAdapter from './ChannelAdapter';

export class SMSAdapter extends ChannelAdapter {
  constructor(config = {}) {
    super(config);
    this.channelName = 'sms';
    this.messageQueue = [];
    this.gateway = config.gateway || 'twilio'; // 'twilio', 'sns', 'vonage'
  }

  async connect() {
    try {
      this.validateConfig();
      // Initialize SMS gateway client
      this.isConnected = true;
      console.log(`SMS adapter connected (${this.gateway})`);
      return { success: true, channel: 'sms', gateway: this.gateway };
    } catch (error) {
      console.error('SMS connection failed:', error);
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
      throw new Error('SMS adapter not connected');
    }

    const formatted = this.formatOutgoing(message);
    
    try {
      const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.messageQueue.push({
        id: messageId,
        message: formatted,
        status: 'pending',
        timestamp: new Date()
      });

      // In production, send via SMS gateway
      // const response = await sendViaGateway(formatted);

      return {
        id: messageId,
        status: 'queued',
        timestamp: new Date(),
        channel: 'sms',
        cost: this.calculateSMSCost(formatted.Body)
      };
    } catch (error) {
      console.error('SMS send error:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    if (!this.isConnected) {
      throw new Error('SMS adapter not connected');
    }

    return {
      id: conversationId,
      channel: 'sms',
      messages: [],
      contact: {},
      lastUpdated: new Date()
    };
  }

  async getConversations(contactId) {
    if (!this.isConnected) {
      throw new Error('SMS adapter not connected');
    }

    return [
      {
        id: `sms_conv_${contactId}`,
        channel: 'sms',
        contact: { id: contactId, phone: contactId },
        lastMessage: '',
        lastUpdated: new Date()
      }
    ];
  }

  async getContacts() {
    if (!this.isConnected) {
      return [];
    }

    // Fetch SMS contacts from gateway
    return [];
  }

  async markAsRead(messageId, conversationId) {
    return { success: true, messageId, conversationId };
  }

  async getStats() {
    const baseStats = await super.getStats();
    const sentMessages = this.messageQueue.filter(m => m.status === 'sent');
    
    return {
      ...baseStats,
      channel: 'sms',
      gateway: this.gateway,
      queuedMessages: this.messageQueue.filter(m => m.status === 'pending').length,
      messagesSent: sentMessages.length,
      estimatedCost: sentMessages.reduce((sum, m) => sum + (m.cost || 0.01), 0)
    };
  }

  formatOutgoing(message) {
    return {
      From: message.sender?.phone || this.config.fromNumber || '+1234567890',
      To: message.recipient?.phone || message.to,
      Body: message.content || message.text || ''
    };
  }

  parseIncoming(rawData) {
    // Parse SMS provider webhook payload
    // Twilio format: From, To, Body, MessageSid, etc.
    return {
      id: rawData.MessageSid || rawData.messageId,
      from: rawData.From,
      to: rawData.To,
      timestamp: new Date(),
      type: 'sms',
      text: rawData.Body || ''
    };
  }

  /**
   * Calculate SMS cost based on length
   * Most providers charge per message (160 chars for single SMS)
   */
  calculateSMSCost(text) {
    const charCount = text?.length || 0;
    const messageCount = Math.ceil(charCount / 160);
    const costPerMessage = 0.0075; // Standard SMS cost
    return messageCount * costPerMessage;
  }

  /**
   * Check message length and warn if requires multiple SMS
   */
  getMessageInfo(text) {
    const charCount = text?.length || 0;
    const messageCount = Math.ceil(charCount / 160);
    
    return {
      characters: charCount,
      segments: messageCount,
      remainingChars: (messageCount * 160) - charCount,
      cost: this.calculateSMSCost(text),
      willBeSplitInto: messageCount > 1 ? messageCount : 1
    };
  }

  /**
   * Register webhook for incoming SMS
   */
  registerWebhookHandler(handler) {
    this.webhookHandler = handler;
    return 'sms-webhook';
  }

  /**
   * Process incoming SMS webhook
   */
  async processWebhook(payload) {
    if (this.webhookHandler) {
      try {
        await this.webhookHandler(payload);
      } catch (error) {
        console.error('SMS webhook handler error:', error);
      }
    }
  }
}

export default SMSAdapter;
