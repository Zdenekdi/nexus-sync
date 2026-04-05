/**
 * Enhanced Communication Adapters with Database Integration
 * Connects CommunicationService to production backend
 */

import { WhatsAppAdapter } from '../communication/WhatsAppAdapter';
import { SMSAdapter } from '../communication/SMSAdapter';
import { WebChatAdapter } from '../communication/WebChatAdapter';

/**
 * DatabaseBackedWhatsAppAdapter - WhatsApp s databází
 */
export class DatabaseBackedWhatsAppAdapter extends WhatsAppAdapter {
  constructor(config, database) {
    super(config);
    this.database = database;
  }

  async send(message) {
    try {
      // Uložit zprávu do DB
      const dbMessage = await this.database.messages.createMessage({
        ...message,
        channel: 'whatsapp',
        status: 'queued'
      });

      // Odeslat přes API
      const result = await super.send(message);

      // Aktualizovat status v DB
      await this.database.messages.updateMessage?.(dbMessage.id, {
        status: 'sent',
        externalId: result.id
      });

      return result;
    } catch (error) {
      // Log chyby do DB
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    // Načíst z DB
    return await this.database.conversations.getConversation(conversationId);
  }

  async getConversations(contactId) {
    // Načíst konverzace pro kontakt z DB
    return await this.database.conversations.getConversations({
      participants: contactId,
      channel: 'whatsapp'
    });
  }

  async markAsRead(messageId, conversationId) {
    // Aktualizovat v DB
    return await this.database.messages.markAsRead(messageId, conversationId);
  }
}

/**
 * DatabaseBackedSMSAdapter - SMS s databází
 */
export class DatabaseBackedSMSAdapter extends SMSAdapter {
  constructor(config, database) {
    super(config);
    this.database = database;
  }

  async send(message) {
    try {
      // Uložit zprávu do DB
      const dbMessage = await this.database.messages.createMessage({
        ...message,
        channel: 'sms',
        status: 'queued',
        cost: this.calculateSMSCost(message.content)
      });

      // Odeslat přes API
      const result = await super.send(message);

      // Aktualizovat status
      await this.database.messages.updateMessage?.(dbMessage.id, {
        status: 'sent',
        externalId: result.id,
        sentAt: new Date()
      });

      // Track analytics event
      if (this.database.analytics) {
        await this.database.analytics.trackEvent({
          type: 'sms.sent',
          operatorId: message.operatorId,
          agencyId: message.agencyId,
          cost: this.calculateSMSCost(message.content)
        });
      }

      return result;
    } catch (error) {
      console.error('SMS send error:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    return await this.database.conversations.getConversation(conversationId);
  }

  async getConversations(contactId) {
    return await this.database.conversations.getConversations({
      participants: contactId,
      channel: 'sms'
    });
  }

  async markAsRead(messageId, conversationId) {
    return await this.database.messages.markAsRead(messageId, conversationId);
  }
}

/**
 * DatabaseBackedWebChatAdapter - Web Chat s databází
 */
export class DatabaseBackedWebChatAdapter extends WebChatAdapter {
  constructor(config, database) {
    super(config);
    this.database = database;
  }

  async startSession(visitorInfo) {
    const session = await super.startSession(visitorInfo);

    // Uložit session do DB
    if (this.database.conversations) {
      const dbSession = await this.database.conversations.createConversation(
        [visitorInfo.visitorId, 'system'],
        {
          channel: 'webchat',
          visitorName: visitorInfo.name,
          visitorEmail: visitorInfo.email,
          sessionId: session.sessionId
        }
      );
      session.dbId = dbSession.id;
    }

    return session;
  }

  async send(message) {
    try {
      // Uložit zprávu do DB
      const dbMessage = await this.database.messages.createMessage({
        ...message,
        channel: 'webchat',
        conversationId: message.sessionId,
        status: 'sent',
        timestamp: new Date()
      });

      const result = await super.send(message);

      // Track real-time event
      if (this.database.analytics) {
        await this.database.analytics.trackEvent({
          type: message.isOperator ? 'chat.operator_message' : 'chat.visitor_message',
          operatorId: message.isOperator ? message.operatorId : null,
          metadata: { sessionId: message.sessionId }
        });
      }

      return result;
    } catch (error) {
      console.error('WebChat send error:', error);
      throw error;
    }
  }

  async getConversation(sessionId) {
    // Načíst session z DB
    const conversation = await this.database.conversations.getConversation(sessionId);
    
    if (conversation) {
      // Load messages
      const messages = await this.database.conversations.getConversation(sessionId);
      return {
        ...conversation,
        messages: messages.messages || []
      };
    }

    // Fallback na local session
    return super.getConversation(sessionId);
  }

  async endSession(sessionId) {
    const result = await super.endSession(sessionId);

    // Uzavřít konverzaci v DB
    if (this.database.conversations) {
      await this.database.conversations.closeConversation(sessionId, 'User ended session');
    }

    return result;
  }

  async assignOperator(sessionId, operatorId, operatorName) {
    const result = await super.assignOperator(sessionId, operatorId, operatorName);

    // Aktualizovat assignment v DB
    if (this.database.conversations) {
      await this.database.conversations.assignOperator(sessionId, operatorId);
    }

    return result;
  }

  async markAsRead(messageId, sessionId) {
    const result = await super.markAsRead(messageId, sessionId);

    // Aktualizovat v DB
    if (this.database.messages) {
      await this.database.messages.markAsRead(messageId, sessionId);
    }

    return result;
  }
}

export {
  DatabaseBackedWhatsAppAdapter,
  DatabaseBackedSMSAdapter,
  DatabaseBackedWebChatAdapter
};
