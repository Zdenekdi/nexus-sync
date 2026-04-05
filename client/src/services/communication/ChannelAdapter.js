/**
 * ChannelAdapter - Abstract base class for channel implementations
 * Each specific channel (WhatsApp, SMS, WebChat) extends this
 */

export class ChannelAdapter {
  constructor(config = {}) {
    this.config = config;
    this.isConnected = false;
  }

  /**
   * Initialize connection to channel provider
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Close connection
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Send message through this channel
   * @param {Object} message - Message object
   * @returns {Promise<{id, status, timestamp}>}
   */
  async send(message) {
    throw new Error('send() must be implemented by subclass');
  }

  /**
   * Retrieve conversation history
   */
  async getConversation(conversationId) {
    throw new Error('getConversation() must be implemented by subclass');
  }

  /**
   * Get list of conversations
   */
  async getConversations(contactId) {
    throw new Error('getConversations() must be implemented by subclass');
  }

  /**
   * Get available contacts/chats
   */
  async getContacts() {
    throw new Error('getContacts() must be implemented by subclass');
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, conversationId) {
    throw new Error('markAsRead() must be implemented by subclass');
  }

  /**
   * Get channel statistics
   */
  async getStats() {
    return {
      connected: this.isConnected,
      messagesSent: 0,
      messagesReceived: 0,
      conversations: 0
    };
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (!this.config.apiKey && !this.config.token) {
      throw new Error('Missing API credentials');
    }
  }

  /**
   * Parse incoming webhook/notification
   */
  parseIncoming(rawData) {
    throw new Error('parseIncoming() must be implemented by subclass');
  }

  /**
   * Format outgoing message for API
   */
  formatOutgoing(message) {
    throw new Error('formatOutgoing() must be implemented by subclass');
  }
}

export default ChannelAdapter;
