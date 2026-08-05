import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNexus } from '../context/ContextHook';
import { useSocketBridge } from '../services/socketBridge';

// ─── Icons ───────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ChatIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const TrashIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const MinimizeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}
function getAvatarColor(name = '') {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];
  return colors[(name || '').charCodeAt(0) % colors.length];
}
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return `včera ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const color = getAvatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}cc, ${color}66)`,
      border: `2px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Rooms config ────────────────────────────────────────────────────────────
const ROOMS = [
  { id: 'general', label: '# Obecné', emoji: '💬', access: () => true },
  { id: 'managers', label: '# Manažeři', emoji: '👔', access: (op) => !!(op?.isManager || op?.isAdmin || op?.isAppOwner) },
  { id: 'models', label: '# Týmová nástěnka', emoji: '📌', access: (op) => !(op?.isAdmin || op?.isAppOwner) },
];

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, currentUserId, isManager, onDelete }) {
  const [hover, setHover] = useState(false);
  const isOwn = msg.author?.id === currentUserId;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', gap: '0.5rem', padding: '0.25rem 0',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        position: 'relative',
      }}
    >
      {!isOwn && <Avatar name={msg.author?.name} size={28} />}

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: 3, marginLeft: 2, fontWeight: 600 }}>
            {msg.author?.name}
          </span>
        )}
        <div style={{
          padding: '0.5rem 0.85rem',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOwn
            ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.15))'
            : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isOwn ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.07)'}`,
          fontSize: '0.875rem',
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          wordBreak: 'break-word',
          position: 'relative',
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: 2, opacity: 0.6 }}>
          {formatTime(msg.createdAt)}
        </span>
      </div>

      {/* Delete button on hover */}
      {hover && (isOwn || isManager) && (
        <button
          onClick={() => onDelete(msg.id)}
          style={{
            position: 'absolute', top: 4, [isOwn ? 'left' : 'right']: 0,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6, padding: '3px 6px', color: '#ef4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', fontSize: '0.65rem', gap: 3,
            opacity: 0.8, transition: 'opacity 0.15s',
          }}
          title="Smazat"
        >
          <TrashIcon size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Date separator ──────────────────────────────────────────────────────────
function DateSeparator({ dateStr }) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  let label = d.toLocaleDateString('cs-CZ', { day: '2-digit', month: 'long', year: 'numeric' });
  if (diffDays === 0) label = 'Dnes';
  else if (diffDays === 1) label = 'Včera';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ─── Main TeamChatPanel ───────────────────────────────────────────────────────
export default function TeamChatPanel({ onClose, onMinimize }) {
  const { token, API_BASE, activeOperator } = useNexus();
  const socket = useSocketBridge();
  const currentUserId = activeOperator?.id;
  const isManager = !!(activeOperator?.isManager || activeOperator?.isAdmin || activeOperator?.isAppOwner);

  const availableRooms = ROOMS.filter(r => r.access(activeOperator));
  const [activeRoom, setActiveRoom] = useState(availableRooms[0]?.id || 'general');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const loadMessages = useCallback(async (silent = false) => {
    if (!token || !API_BASE) return;
    if (!silent) setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/team-chat/messages?room=${activeRoom}&limit=60`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newMsgs = Array.isArray(r.data) ? r.data : [];
      setMessages(prev => {
        // Zprávy čekající na potvrzení ze serveru musí přežít.
        //
        // Tohle nahrazovalo celý seznam tím, co přišlo ze serveru. Když
        // načtení doběhlo v okamžiku mezi optimistickým přidáním (sendMessage)
        // a odpovědí na POST, odeslaná zpráva ze seznamu ZMIZELA — uživateli
        // před očima. Objevila se až s dalším načtením, kdy už ji server znal.
        //
        // Projevovalo se to jako nestabilní test „Odeslání zprávy funguje"
        // (na nedotčeném masteru padal zhruba jednou z osmi běhů), ale je to
        // chyba produktu, ne testu.
        const pending = prev.filter(m => m._optimistic);
        const sameIds = JSON.stringify(prev.map(m => m.id)) === JSON.stringify(newMsgs.map(m => m.id));
        if (sameIds) return prev;
        if (!pending.length) return newMsgs;
        // Nepotvrzené držíme na konci; POST je pak nahradí podle id.
        const knownIds = new Set(newMsgs.map(m => m.id));
        return [...newMsgs, ...pending.filter(m => !knownIds.has(m.id))];
      });
      setError('');
    } catch (_err) {
      if (!silent) setError('Chyba při načítání zpráv');
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE, activeRoom]);

  // Initial load + scroll
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    loadMessages().then(() => scrollToBottom(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom]);

  // Poll every 5s
  useEffect(() => {
    pollRef.current = setInterval(() => loadMessages(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // Socket.io real-time
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.room !== activeRoom) return;
      setMessages(prev => {
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(() => scrollToBottom(), 50);
    };
    const deleteHandler = (data) => {
      if (data.room === activeRoom) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    };
    socket.on('team_chat_message', handler);
    socket.on('team_chat_delete', deleteHandler);
    return () => {
      socket.off('team_chat_message', handler);
      socket.off('team_chat_delete', deleteHandler);
    };
  }, [socket, activeRoom, scrollToBottom]);

  // Scroll to bottom when messages load initially
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      text: text.trim(),
      room: activeRoom,
      author: { id: currentUserId, name: activeOperator?.name || 'Já' },
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setText('');
    scrollToBottom();
    try {
      const r = await axios.post(`${API_BASE}/team-chat/messages`, { room: activeRoom, text: optimisticMsg.text }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? r.data : m));
    } catch (_err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setText(optimisticMsg.text);
      setError('Zpráva nebyla odeslána');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const deleteMessage = async (id) => {
    try {
      await axios.delete(`${API_BASE}/team-chat/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {
      setError('Smazání selhalo');
    }
  };

  // Group messages by date for separators
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: 'date', dateStr: msg.createdAt, key: `date-${d}` });
      lastDate = d;
    }
    grouped.push({ type: 'msg', msg, key: msg.id });
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChatIcon size={18} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Týmový chat</span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button onClick={onMinimize} title="Minimalizovat"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <MinimizeIcon />
          </button>
          <button onClick={onClose} title="Zavřít"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {/* Room tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem', padding: '0.5rem 0.75rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {availableRooms.map(room => (
          <button key={room.id} onClick={() => setActiveRoom(room.id)} style={{
            padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
            background: activeRoom === room.id ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: activeRoom === room.id ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeRoom === room.id ? 700 : 500,
            fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s',
            borderBottom: activeRoom === room.id ? '2px solid var(--accent-color)' : '2px solid transparent',
          }}>
            {room.emoji} {room.label.replace('# ', '')}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem 0' }}>
            Načítám zprávy...
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💬</div>
            <div style={{ fontWeight: 600 }}>Žádné zprávy</div>
            <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.7 }}>Začni konverzaci!</div>
          </div>
        )}
        {grouped.map(item =>
          item.type === 'date'
            ? <DateSeparator key={item.key} dateStr={item.dateStr} />
            : <MessageBubble key={item.key} msg={item.msg} currentUserId={currentUserId} isManager={isManager} onDelete={deleteMessage} />
        )}
        {error && (
          <div style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', padding: '0.25rem 0' }}>{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Napiš zprávu... (Enter = odeslat)"
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, color: '#fff', padding: '0.6rem 0.85rem', fontSize: '0.875rem',
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            outline: 'none', transition: 'border-color 0.2s',
            maxHeight: '120px', overflowY: 'auto',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
            background: text.trim() ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
            color: text.trim() ? '#fff' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s', boxShadow: text.trim() ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
