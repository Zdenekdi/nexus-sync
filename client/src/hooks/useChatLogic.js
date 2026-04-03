import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';

/**
 * Custom hook to encapsulate all chat and messaging logic for Nexus Hub.
 * Extracted from App.jsx to improve maintainability and reduce file size.
 */
export function useChatLogic({
  token,
  API_BASE,
  activeOperator,
  activeProfileId,
  showToast,
  t,
  addNotification,
  playNotificationSound,
  profiles,
  messages,
  setMessages
}) {
  // --- States ---
  // messages state is now passed from NexusContext
  const [chatMessages, setChatMessages] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(() => 
    localStorage.getItem('nexus_lastSelectedChatId') || null
  );
  const [typingProfiles, setTypingProfiles] = useState({});
  const [detectedMeeting, setDetectedMeeting] = useState(null);
  const [messageValue, setMessageValue] = useState('');
  const [newMessage, setNewMessage] = useState(''); // Used in OperationsUnit
  const [isDrafting, setIsDrafting] = useState(false);
  const [contacts, setContacts] = useState([]); // Placeholder if not found in App.jsx
  const [activeContactId, setActiveContactId] = useState(null);
  const [clientNotes, setClientNotes] = useState({});
  const [internalNote, setInternalNote] = useState('');
  const [activeTab, setActiveTabOrChatId] = useState(null); // Used to pass through some logic

  // --- Refs ---
  const chatScrollRef = useRef(null);
  const isUserScrolled = useRef(false);

  // --- Utilities ---
  const parseChatId = useCallback((value) => {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return value;
  }, []);

  const normalizeProfileId = useCallback((value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return String(value);
  }, []);

  // --- Core Messaging Logic ---
  const upsertIncomingMessage = useCallback((incomingMessage) => {
    if (!incomingMessage) return null;

    const resolvedTransport = incomingMessage.transport || incomingMessage.type || 'sms';
    const resolvedText = incomingMessage.text || incomingMessage.content || incomingMessage.body || incomingMessage.message || '';
    const resolvedFrom = incomingMessage.from || incomingMessage.externalId || incomingMessage.phone;
    const resolvedProfileId = normalizeProfileId(
      incomingMessage.profileId ?? incomingMessage.profile?.id ?? activeOperator?.profileId ?? activeProfileId ?? null
    );
    const resolvedChatId = incomingMessage.chatId ?? incomingMessage.id ?? null;
    const resolvedTimestamp = incomingMessage.timestamp || incomingMessage.createdAt || new Date().toISOString();

    const normalizedMessage = {
      ...incomingMessage,
      id: resolvedChatId ?? incomingMessage.id ?? `${resolvedProfileId ?? 'unknown'}:${resolvedFrom}`,
      chatId: resolvedChatId ?? incomingMessage.chatId ?? incomingMessage.id ?? null,
      profileId: resolvedProfileId,
      from: resolvedFrom,
      text: resolvedText,
      content: resolvedText,
      body: resolvedText,
      timestamp: resolvedTimestamp,
      time: new Date(resolvedTimestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }),
      transport: resolvedTransport,
      type: resolvedTransport,
      status: incomingMessage.status || 'unread'
    };

    setMessages(prev => {
      const existingByChatId = normalizedMessage.chatId != null
        ? prev.findIndex(msg => (msg.chatId || msg.id) === normalizedMessage.chatId)
        : -1;
      const existingByProfileAndFrom = existingByChatId === -1
        ? prev.findIndex(msg => normalizeProfileId(msg.profileId) === normalizedMessage.profileId && msg.from === normalizedMessage.from)
        : -1;
      const existingIndex = existingByChatId !== -1 ? existingByChatId : existingByProfileAndFrom;

      if (existingIndex === -1) {
        return [normalizedMessage, ...prev];
      }

      const existing = prev[existingIndex];
      const merged = {
        ...existing,
        ...normalizedMessage,
        id: existing.chatId ?? existing.id ?? normalizedMessage.chatId ?? normalizedMessage.id,
        chatId: existing.chatId ?? normalizedMessage.chatId ?? existing.id ?? normalizedMessage.id,
        profileId: normalizedMessage.profileId ?? normalizeProfileId(existing.profileId)
      };

      const next = [...prev];
      next.splice(existingIndex, 1);
      return [merged, ...next];
    });

    // Sync with currently open chat history
    if (selectedChatId && (normalizedMessage.chatId === selectedChatId || String(normalizedMessage.chatId) === String(selectedChatId))) {
      const isOutbound = (incomingMessage.direction || '').toUpperCase() === 'OUTBOUND';
      const realMessageId = incomingMessage.id;

      setChatMessages(prev => {
        if (isOutbound && realMessageId) {
          const existingIdx = prev.findIndex(m =>
            m.id === realMessageId ||
            (m.text === resolvedText && Math.abs(new Date(m.createdAt || m.timestamp || 0) - new Date(resolvedTimestamp)) < 10000)
          );
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = { ...updated[existingIdx], ...incomingMessage, id: realMessageId };
            return updated;
          }
          return [...prev, { ...normalizedMessage, id: realMessageId }];
        }

        const msgId = realMessageId || normalizedMessage.id;
        const exists = prev.some(m =>
          m.id === msgId ||
          (m.text === resolvedText && Math.abs(new Date(m.createdAt || m.timestamp || 0) - new Date(resolvedTimestamp)) < 10000)
        );
        if (exists) return prev;
        return [...prev, { ...normalizedMessage, id: msgId }];
      });
    }

    return normalizedMessage;
  }, [selectedChatId, activeOperator?.profileId, activeProfileId, normalizeProfileId, parseChatId, setMessages]);

  const fetchChatMessages = useCallback(async (chatId) => {
    if (!token || !chatId) return;
    try {
      setIsHistoryLoading(true);
      const res = await axios.get(`${API_BASE}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatMessages(res.data || []);
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, API_BASE]);

  const filteredMessages = useMemo(() => {
    const toTimestamp = (message) => {
      const raw = message?.timestamp || message?.lastMessageAt || message?.createdAt;
      const ts = raw ? new Date(raw).getTime() : 0;
      return Number.isFinite(ts) ? ts : 0;
    };

    const effectiveActiveProfileId = normalizeProfileId(activeProfileId ?? activeOperator?.profileId ?? null);
    const base = (messages || []).filter(m => normalizeProfileId(m.profileId) === effectiveActiveProfileId);
    return [...base].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  }, [messages, activeProfileId, activeOperator?.profileId, normalizeProfileId]);

  const selectedChat = useMemo(() => {
    if (!selectedChatId) return filteredMessages[0] || null;
    return filteredMessages.find(m => String(m.id) === String(selectedChatId)) || filteredMessages[0] || null;
  }, [filteredMessages, selectedChatId]);

  const handleSendMessage = async (text) => {
    const targetChatId = selectedChatId;
    if (!text?.trim() || !targetChatId) {
      console.warn('[Chat] Aborting send: missing text or chat ID');
      return;
    }
    
    try {
      const res = await axios.post(`${API_BASE}/messages`, {
        chatId: targetChatId,
        text: text.trim(),
        direction: 'OUTBOUND',
        transport: 'sms'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setMessageValue('');
      }
    } catch (error) {
      console.error('Send message error:', error);
      addNotification({
        title: t('sendError') || 'Error',
        message: t('sendErrorMessage') || 'Could not send message. Please check the relay device.',
        type: 'error'
      });
    }
  };

  const handleRefreshMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data || []);
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  }, [token, API_BASE]);

  const handleSaveNote = useCallback(async () => {
    if (!internalNote.trim() || !activeContactId || !activeProfileId) return;
    try {
      const res = await axios.post(`${API_BASE}/notes`, {
        clientPhone: activeContactId,
        text: internalNote,
        profileId: activeProfileId,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setClientNotes(prev => ({
        ...prev,
        [activeContactId]: [res.data, ...(prev[activeContactId] || [])]
      }));
      setInternalNote('');
    } catch (err) {
      console.error('[Notes] save error:', err.message);
    }
  }, [internalNote, activeContactId, activeProfileId, API_BASE, token]);

  const handleDeleteNote = useCallback(async (from, noteId) => {
    try {
      await axios.delete(`${API_BASE}/notes/${noteId}`, { headers: { Authorization: `Bearer ${token}` } });
      setClientNotes(prev => ({
        ...prev,
        [from]: (prev[from] || []).filter(n => n.id !== noteId)
      }));
    } catch (err) {
      console.error('[Notes] delete error:', err.message);
    }
  }, [API_BASE, token]);

  // --- Effects ---
  useEffect(() => {
    if (selectedChatId) {
      fetchChatMessages(selectedChatId);
      localStorage.setItem('nexus_lastSelectedChatId', String(selectedChatId));
    } else {
      setChatMessages([]);
      localStorage.removeItem('nexus_lastSelectedChatId');
    }
  }, [selectedChatId, fetchChatMessages]);

  // Auto-scroll logic
  useEffect(() => {
    if (!isUserScrolled.current && chatScrollRef.current) {
      const el = chatScrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    isUserScrolled.current = false;
    if (chatScrollRef.current) {
      const el = chatScrollRef.current;
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }
  }, [selectedChatId]);

  // Meeting detection
  useEffect(() => {
    if (!chatMessages.length || !selectedChatId) { setDetectedMeeting(null); return; }
    const last = [...chatMessages].reverse().find(m => (m.direction || '').toUpperCase() === 'INBOUND');
    if (!last) { setDetectedMeeting(null); return; }
    
    const text = (last.text || '').toLowerCase();
    const timeMatch = text.match(/\b(\d{1,2})[:\.]?(\d{2})?\s*(am|pm|h)?\b/i);
    if (timeMatch && timeMatch[1]) {
      const hour = parseInt(timeMatch[1]);
      if (hour >= 0 && hour <= 24) {
        let duration = '1h';
        if (text.includes('30 min') || text.includes('půl') || text.includes('pul')) duration = '0.5h';
        let date = new Date().toISOString().split('T')[0];
        if (text.includes('zitra') || text.includes('zítra')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          date = tomorrow.toISOString().split('T')[0];
        }
        setDetectedMeeting({ 
          time: timeMatch[0], 
          messageId: last.id, 
          text: last.text,
          duration,
          date
        });
      }
    } else {
      setDetectedMeeting(null);
    }
  }, [chatMessages, selectedChatId]);

  // Fetch notes Effect
  useEffect(() => {
    if (!activeContactId || !activeProfileId || !token) return;
    const phone = activeContactId;
    if (clientNotes[phone]) return;
    axios.get(`${API_BASE}/notes/${encodeURIComponent(phone)}?profileId=${activeProfileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setClientNotes(prev => ({ ...prev, [phone]: res.data }));
    }).catch(() => {});
  }, [activeContactId, activeProfileId, token, API_BASE, clientNotes]);

  return {
    messages, setMessages,
    chatMessages, setChatMessages,
    isHistoryLoading,
    selectedChatId, setSelectedChatId,
    typingProfiles, setTypingProfiles,
    detectedMeeting, setDetectedMeeting,
    messageValue, setMessageValue,
    newMessage, setNewMessage,
    isDrafting, setIsDrafting,
    contacts, setContacts,
    activeContactId, setActiveContactId,
    clientNotes, setClientNotes,
    internalNote, setInternalNote,
    filteredMessages,
    selectedChat,
    totalUnread: useMemo(() =>
      (messages || []).filter(msg =>
        msg && (profiles || []).map(p => p.id).includes(msg.profileId) &&
        msg.status === 'unread'
      ).length || 0,
      [messages, profiles]
    ),
    getUnreadForProfile: (profileId) => {
      return (messages || []).filter(msg => msg.profileId === profileId && msg.status === 'unread').length;
    },
    chatScrollRef,
    isUserScrolled,
    upsertIncomingMessage,
    fetchChatMessages,
    handleSendMessage,
    handleRefreshMessages,
    handleSaveNote,
    handleDeleteNote,
    normalizeProfileId,
    parseChatId
  };
}
