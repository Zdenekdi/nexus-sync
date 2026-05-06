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
} from '../../services/communication';

export const useOmnichannel = (config = {}) => {
  const [channels, setChannels] = useState({});
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const commServiceRef = useRef(null);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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
          } catch (_err) {
            console.warn(`Failed to connect ${channelName}:`, _err);
            setChannels(prev => ({
              ...prev,
              [channelName]: { connected: false, _err: _err.message }
            }));
          }
        }
      });

      // Register message handler
      service.onMessage(async (message) => {
        setMessages(prev => [...prev, message]);
      });

      // Register event listeners
      service.on('messageSent', () => {});

      service.on('messageError', (data) => {
        setError(data.error);
      });

      commServiceRef.current = service;
    } catch (_err) {
      setError(_err);
      console.error('Omnichannel initialization error:', _err);
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
  }, [channels]); // eslint-disable-line react-hooks/exhaustive-deps

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
    } catch (_err) {
      setError(_err);
      throw _err;
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
    } catch (_err) {
      setError(_err);
      throw _err;
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
    } catch (_err) {
      setError(_err);
      throw _err;
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
    } catch (_err) {
      console.error('Error getting channel stats:', _err);
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
    } catch (_err) {
      setError(_err);
      throw _err;
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
