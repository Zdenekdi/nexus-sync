/**
 * CommunicationService - Abstract interface for omnichannel communication
 * Provides unified API for WhatsApp, SMS, and Web Chat
 */

export class CommunicationService {
  constructor(config = {}) {
    this.config = config;
    this.adapters = new Map();
    this.messageHandlers = [];
    this.eventEmitters = new Map();
  }

  /**
   * Register a communication channel adapter
   * @param {string} channelType - 'whatsapp', 'sms', 'webchat'
   * @param {ChannelAdapter} adapter - Channel-specific adapter
   */
  registerAdapter(channelType, adapter) {
    this.adapters.set(channelType.toLowerCase(), adapter);
    return this;
  }

  /**
   * Get adapter for specific channel
   */
  getAdapter(channelType) {
    return this.adapters.get(channelType.toLowerCase());
  }

  /**
   * Send message through specified channel
   * @param {string} channelType - 'whatsapp', 'sms', 'webchat'
   * @param {Object} message - Message payload
   * @returns {Promise} Message delivery confirmation
   */
  async sendMessage(channelType, message) {
    const adapter = this.getAdapter(channelType);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelType}`);
    }

    try {
      const result = await adapter.send(message);
      this.emitEvent('messageSent', {
        channel: channelType,
        message,
        result,
        timestamp: new Date()
      });
      return result;
    } catch (_err) {
      this.emitEvent('messageError', {
        channel: channelType,
        message,
        _err,
        timestamp: new Date()
      });
      throw _err;
    }
  }

  /**
   * Receive and route incoming messages
   * @param {string} channelType - Source channel
   * @param {Object} message - Incoming message
   */
  async receiveMessage(channelType, message) {
    const normalizedMessage = {
      id: message.id || `msg_${Date.now()}`,
      channel: channelType,
      conversationId: message.conversationId || message.chatId || message.threadId,
      sender: message.sender || message.from || {},
      recipient: message.recipient || message.to || {},
      content: message.content || message.body || message.text || '',
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata || {},
      ...message
    };

    // Route to handlers
    for (const handler of this.messageHandlers) {
      try {
        await handler(normalizedMessage);
      } catch (_err) {
        console.error('Message handler _err:', _err);
      }
    }

    this.emitEvent('messageReceived', normalizedMessage);
    return normalizedMessage;
  }

  /**
   * Get conversation/chat thread
   */
  async getConversation(channelType, conversationId) {
    const adapter = this.getAdapter(channelType);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelType}`);
    }
    return adapter.getConversation(conversationId);
  }

  /**
   * Get all conversations for a contact/client
   */
  async getConversations(channelType, contactId) {
    const adapter = this.getAdapter(channelType);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelType}`);
    }
    return adapter.getConversations(contactId);
  }

  /**
   * Register message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.eventEmitters.has(event)) {
      this.eventEmitters.set(event, []);
    }
    this.eventEmitters.get(event).push(callback);
    return () => {
      const handlers = this.eventEmitters.get(event);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit event
   */
  emitEvent(event, data) {
    const handlers = this.eventEmitters.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (_err) {
        console.error(`Error in ${event} handler:`, _err);
      }
    });
  }

  /**
   * Get statistics for channel
   */
  async getChannelStats(channelType) {
    const adapter = this.getAdapter(channelType);
    if (!adapter) {
      return null;
    }
    return adapter.getStats?.() || {};
  }

  /**
   * Mark message as read
   */
  async markAsRead(channelType, messageId, conversationId) {
    const adapter = this.getAdapter(channelType);
    if (!adapter) {
      throw new Error(`No adapter registered for channel: ${channelType}`);
    }
    return adapter.markAsRead?.(messageId, conversationId);
  }
}

export default CommunicationService;
