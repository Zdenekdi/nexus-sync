/**
 * useOmnichannel - React hook for omnichannel communication
 * Provides unified interface to manage messages across channels
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CommunicationService,
  WhatsAppAdapter,
  SMSAdapter,
  WebChatAdapter
} from '../services/communication';

export const useOmnichannel = (config = {}) => {
  const [channels, setChannels] = useState({});
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const commServiceRef = useRef(null);

  // Initialize communication service
  useEffect(() => {
    try {
      const service = new CommunicationService(config);
      
      // Register adapters
      service.registerAdapter('whatsapp', new WhatsAppAdapter(config.whatsapp || {}));
      service.registerAdapter('sms', new SMSAdapter(config.sms || {}));
      service.registerAdapter('webchat', new WebChatAdapter(config.webchat || {}));
      
      // Connect all adapters
      Object.entries(config).forEach(async ([channelName, channelConfig]) => {
        if (['whatsapp', 'sms', 'webchat'].includes(channelName)) {
          try {
            const adapter = service.getAdapter(channelName);
            await adapter.connect();
            setChannels(prev => ({
              ...prev,
              [channelName]: { connected: true, ...channelConfig }
            }));
          } catch (err) {
            console.warn(`Failed to connect ${channelName}:`, err);
            setChannels(prev => ({
              ...prev,
              [channelName]: { connected: false, error: err.message }
            }));
          }
        }
      });

      // Register message handler
      service.onMessage(async (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Register event listeners
      service.on('messageSent', (data) => {
        console.log('Message sent:', data);
      });

      service.on('messageError', (data) => {
        setError(data.error);
      });

      commServiceRef.current = service;
    } catch (err) {
      setError(err);
      console.error('Omnichannel initialization error:', err);
    }

    return () => {
      // Cleanup
      if (commServiceRef.current) {
        Object.keys(channels).forEach(channelName => {
          const adapter = commServiceRef.current.getAdapter(channelName);
          adapter?.disconnect?.();
        });
      }
    };
  }, [config]);

  /**
   * Send message through specific channel
   */
  const sendMessage = useCallback(async (channelType, message) => {
    if (!commServiceRef.current) {
      throw new Error('Communication service not initialized');
    }

    setIsLoading(true);
    try {
      const result = await commServiceRef.current.sendMessage(channelType, message);
      setMessages(prev => [...prev, { ...message, ...result }]);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get conversation from specific channel
   */
  const getConversation = useCallback(async (channelType, conversationId) => {
    if (!commServiceRef.current) {
      throw new Error('Communication service not initialized');
    }

    setIsLoading(true);
    try {
      const conversation = await commServiceRef.current.getConversation(
        channelType,
        conversationId
      );
      return conversation;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all conversations for contact
   */
  const getConversations = useCallback(async (channelType, contactId) => {
    if (!commServiceRef.current) {
      throw new Error('Communication service not initialized');
    }

    setIsLoading(true);
    try {
      const convs = await commServiceRef.current.getConversations(
        channelType,
        contactId
      );
      setConversations(prev => [
        ...prev.filter(c => c.channel !== channelType),
        ...convs
      ]);
      return convs;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get channel statistics
   */
  const getChannelStats = useCallback(async (channelType) => {
    if (!commServiceRef.current) {
      return null;
    }

    try {
      return await commServiceRef.current.getChannelStats(channelType);
    } catch (err) {
      console.error('Error getting channel stats:', err);
      return null;
    }
  }, []);

  /**
   * Mark message as read
   */
  const markAsRead = useCallback(async (channelType, messageId, conversationId) => {
    if (!commServiceRef.current) {
      throw new Error('Communication service not initialized');
    }

    try {
      return await commServiceRef.current.markAsRead(
        channelType,
        messageId,
        conversationId
      );
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  /**
   * Filter messages by channel
   */
  const getChannelMessages = useCallback((channelType) => {
    return messages.filter(msg => msg.channel === channelType);
  }, [messages]);

  /**
   * Filter conversations by channel
   */
  const getChannelConversations = useCallback((channelType) => {
    return conversations.filter(conv => conv.channel === channelType);
  }, [conversations]);

  return {
    // State
    channels,
    messages,
    conversations,
    isLoading,
    error,
    
    // Methods
    sendMessage,
    getConversation,
    getConversations,
    getChannelStats,
    markAsRead,
    getChannelMessages,
    getChannelConversations,
    
    // Service reference (advanced usage)
    service: commServiceRef.current
  };
};

export default useOmnichannel;
