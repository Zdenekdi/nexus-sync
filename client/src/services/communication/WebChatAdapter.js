/**
 * WebChatAdapter - Web Chat widget integration
 * Embedded chat for website visitors
 */

import ChannelAdapter from './ChannelAdapter';

export class WebChatAdapter extends ChannelAdapter {
  constructor(config = {}) {
    super(config);
    this.channelName = 'webchat';
    this.sessions = new Map();
    this.messageQueue = [];
  }

  async connect() {
    try {
      this.validateConfig();
      // Initialize WebSocket connection for real-time chat
      this.isConnected = true;
      return { success: true, channel: 'webchat' };
    } catch (error) {
      console.error('WebChat connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    this.sessions.forEach((session) => {
      session.socket?.disconnect?.();
    });
    this.sessions.clear();
    this.isConnected = false;
  }

  /**
   * Start a new chat session
   */
  async startSession(visitorInfo) {
    const sessionId = `wc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      visitorId: visitorInfo.visitorId || sessionId,
      visitorName: visitorInfo.name || 'Anonymous',
      visitorEmail: visitorInfo.email || null,
      startTime: new Date(),
      messages: [],
      assignedOperator: null,
      status: 'waiting' // waiting, active, closed
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      status: 'created',
      timestamp: new Date()
    };
  }

  /**
   * End chat session
   */
  async endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      session.endTime = new Date();
      session.duration = session.endTime - session.startTime;
    }
    return { success: true, sessionId };
  }

  /**
   * Assign operator to session
   */
  async assignOperator(sessionId, operatorId, operatorName) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    session.assignedOperator = { id: operatorId, name: operatorName };
    session.status = 'active';
    session.assignedAt = new Date();
    
    return { success: true, sessionId, operator: session.assignedOperator };
  }

  async send(message) {
    if (!this.isConnected) {
      throw new Error('WebChat adapter not connected');
    }

    const { sessionId, isOperator } = message;
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const messageId = `msg_${Date.now()}`;
    const chatMessage = {
      id: messageId,
      sessionId,
      sender: isOperator ? 'operator' : 'visitor',
      senderName: isOperator ? 'Agent' : session.visitorName,
      content: message.content || message.text,
      timestamp: new Date(),
      read: false
    };

    session.messages.push(chatMessage);
    this.messageQueue.push(chatMessage);

    return {
      id: messageId,
      status: 'sent',
      timestamp: new Date(),
      channel: 'webchat'
    };
  }

  async getConversation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: sessionId,
      channel: 'webchat',
      visitor: {
        name: session.visitorName,
        email: session.visitorEmail
      },
      operator: session.assignedOperator,
      messages: session.messages,
      status: session.status,
      duration: session.duration || (new Date() - session.startTime),
      createdAt: session.startTime
    };
  }

  async getConversations(visitorId) {
    const conversations = Array.from(this.sessions.values())
      .filter(session => session.visitorId === visitorId)
      .map(session => ({
        id: session.id,
        channel: 'webchat',
        visitorName: session.visitorName,
        lastMessage: session.messages[session.messages.length - 1]?.content || '',
        status: session.status,
        assignedOperator: session.assignedOperator,
        lastUpdated: session.messages[session.messages.length - 1]?.timestamp || session.startTime
      }));

    return conversations;
  }

  async getContacts() {
    // Return active sessions
    return Array.from(this.sessions.values())
      .filter(session => session.status !== 'closed')
      .map(session => ({
        id: session.visitorId,
        name: session.visitorName,
        email: session.visitorEmail,
        sessionId: session.id,
        status: session.status
      }));
  }

  async markAsRead(messageId, sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const message = session.messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
      message.readAt = new Date();
    }

    return { success: true, messageId };
  }

  async getStats() {
    const baseStats = await super.getStats();
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'active').length;
    
    const totalMessages = Array.from(this.sessions.values())
      .reduce((sum, s) => sum + s.messages.length, 0);

    return {
      ...baseStats,
      channel: 'webchat',
      activeSessions,
      totalSessions: this.sessions.size,
      totalMessages,
      awaitingAssignment: Array.from(this.sessions.values())
        .filter(s => s.status === 'waiting').length
    };
  }

  formatOutgoing(message) {
    return {
      sessionId: message.sessionId,
      type: 'text',
      sender: message.sender || 'operator',
      content: message.content || message.text,
      timestamp: new Date()
    };
  }

  parseIncoming(rawData) {
    return {
      id: rawData.messageId,
      sessionId: rawData.sessionId,
      from: rawData.visitorId,
      timestamp: new Date(rawData.timestamp),
      type: 'text',
      text: rawData.message || ''
    };
  }

  /**
   * Register event listener for session changes
   */
  registerEventHandler(eventType, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map();
    }
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  /**
   * Emit session event
   */
  emitSessionEvent(eventType, data) {
    if (!this.eventHandlers?.has(eventType)) {
      return;
    }
    
    this.eventHandlers.get(eventType).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${eventType} handler:`, error);
      }
    });
  }

  /**
   * Queue supervisor alert
   */
  async alertSupervisor(sessionId, reason) {
    return {
      sessionId,
      alertType: reason,
      timestamp: new Date(),
      status: 'sent'
    };
  }
}

export default WebChatAdapter;
