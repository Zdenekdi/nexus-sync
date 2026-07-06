import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, ArrowLeft, Plus, Loader2, AlertCircle, Search } from 'lucide-react';
import { useSmsRelay } from '../plugins/NexusSms';
import { registerPlugin } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const NexusRelayPlugin = registerPlugin('NexusRelay', { web: {} });

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatThreadTime(ts) {
  const now = new Date();
  const d = new Date(ts);
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Včera';
  if (diffDays < 7) return d.toLocaleDateString('cs-CZ', { weekday: 'short' });
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
}

function formatDaySeparator(ts) {
  const now = new Date();
  const d = new Date(ts);
  const diffDays = Math.floor((now.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000);
  if (diffDays === 0) return 'Dnes';
  if (diffDays === 1) return 'Včera';
  if (diffDays < 7) return new Date(ts).toLocaleDateString('cs-CZ', { weekday: 'long' });
  return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: diffDays > 365 ? 'numeric' : undefined });
}

function isSameDay(ts1, ts2) {
  const a = new Date(ts1), b = new Date(ts2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getInitials(addr) {
  if (!addr) return '?';
  const digits = addr.replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(-2) : addr.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#1a73e8','#34a853','#ea4335','#fbbc05','#9334e8','#00897b','#e64a19','#5c6bc0'];
function avatarColor(addr) {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) & 0xFFFF;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Main component ─────────────────────────────────────────────────────────────
const RelaySmsModal = ({ isOpen, onClose }) => {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isNewMsg, setIsNewMsg] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const { sendSmsNative, incomingSms } = useSmsRelay();
  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Hardware back button: chat → list → close
  useEffect(() => {
    if (!isOpen) return;
    let listener;
    CapacitorApp.addListener('backButton', () => {
      if (activeThread || isNewMsg) {
        setActiveThread(null);
        setIsNewMsg(false);
      } else {
        onClose();
      }
    }).then(l => listener = l);
    return () => { if (listener) listener.remove(); };
  }, [isOpen, activeThread, isNewMsg, onClose]);

  useEffect(() => {
    if (isOpen) loadHistory();
    else {
      setActiveThread(null);
      setIsNewMsg(false);
      setRecipient('');
      setMessage('');
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (incomingSms && isOpen) loadHistory();
  }, [incomingSms, isOpen]);

  // Scroll to bottom when entering a chat or new message arrives
  useEffect(() => {
    if (activeThread && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeThread, threads]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const res = await NexusRelayPlugin.getSmsHistory({ lastTimestamp: ninetyDaysAgo, limit: 5000 });
      if (res?.messages) {
        const groups = {};
        res.messages.forEach(msg => {
          let addr = msg.address;
          if (!addr) return;
          addr = addr.replace(/[\s\-\(\)]/g, '');
          if (addr.startsWith('00')) addr = '+' + addr.substring(2);
          if (addr.length === 9 && !addr.startsWith('+')) addr = '+420' + addr;
          msg.normalizedAddress = addr;
          if (!groups[addr]) groups[addr] = { address: addr, messages: [], lastDate: msg.date };
          groups[addr].messages.push(msg);
          if (msg.date > groups[addr].lastDate) groups[addr].lastDate = msg.date;
        });
        const sorted = Object.values(groups).sort((a, b) => b.lastDate - a.lastDate);
        sorted.forEach(t => t.messages.sort((a, b) => a.date - b.date));
        setThreads(sorted);
      }
    } catch (err) {
      setLoadError(err?.message || 'Nepodařilo se načíst SMS historii.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    const target = isNewMsg ? recipient.trim() : activeThread?.address;
    if (!target || !message.trim() || !sendSmsNative) return;
    const msgText = message.trim();
    setMessage('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    const optimistic = { id: 'opt_' + Date.now(), address: target, body: msgText, date: Date.now(), type: 'outbound' };
    setThreads(prev => {
      const next = [...prev];
      const idx = next.findIndex(t => t.address === target);
      if (idx === -1) {
        next.unshift({ address: target, messages: [optimistic], lastDate: optimistic.date });
      } else {
        next[idx] = { ...next[idx], messages: [...next[idx].messages, optimistic], lastDate: optimistic.date };
        next.sort((a, b) => b.lastDate - a.lastDate);
      }
      return next;
    });

    if (isNewMsg) { setIsNewMsg(false); setActiveThread({ address: target }); }
    await sendSmsNative(target, msgText);
    setTimeout(loadHistory, 1200);
  }, [isNewMsg, recipient, activeThread, message, sendSmsNative]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  if (!isOpen) return null;

  const currentThread = activeThread
    ? threads.find(t => t.address === activeThread.address) || { address: activeThread.address, messages: [] }
    : null;

  const filteredThreads = search.trim()
    ? threads.filter(t => t.address.includes(search) || t.messages.some(m => m.body?.toLowerCase().includes(search.toLowerCase())))
    : threads;

  // ── Thread list ──────────────────────────────────────────────────────────────
  const renderList = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {/* Search bar */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.07)', borderRadius: '24px', padding: '0.55rem 1rem' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Hledat zprávy..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.95rem', flex: 1, minWidth: 0 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: '#64748b' }}>
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : loadError ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={32} />
          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{loadError}</div>
          <button onClick={loadHistory} style={{ padding: '0.5rem 1.25rem', background: '#1a73e8', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Zkusit znovu</button>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
          {search ? 'Žádné výsledky.' : 'Žádné zprávy.'}
        </div>
      ) : filteredThreads.map(thread => {
        const lastMsg = thread.messages[thread.messages.length - 1];
        const isUnread = lastMsg?.type === 'inbound' && !lastMsg.read;
        const color = avatarColor(thread.address);
        return (
          <div
            key={thread.address}
            onClick={() => setActiveThread({ address: thread.address })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
            onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onTouchEnd={e => e.currentTarget.style.background = ''}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            {/* Avatar */}
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '1rem', letterSpacing: '0.5px' }}>
              {getInitials(thread.address)}
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ color: 'white', fontWeight: isUnread ? '700' : '500', fontSize: '0.975rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                  {thread.address}
                </span>
                <span style={{ color: isUnread ? '#8ab4f8' : '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                  {formatThreadTime(thread.lastDate)}
                </span>
              </div>
              <div style={{ color: isUnread ? '#e2e8f0' : '#64748b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lastMsg?.type === 'outbound' && <span style={{ color: '#94a3b8', marginRight: '3px' }}>Vy:</span>}
                {lastMsg?.body || ''}
              </div>
            </div>
            {isUnread && (
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8ab4f8', flexShrink: 0 }} />
            )}
          </div>
        );
      })}

      {/* FAB - new message */}
      {!loading && (
        <button
          onClick={() => setIsNewMsg(true)}
          style={{
            position: 'fixed', right: '1.25rem',
            bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
            width: '56px', height: '56px', borderRadius: '16px',
            background: '#1a73e8', border: 'none', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(26,115,232,0.5)', cursor: 'pointer', zIndex: 10,
            transition: 'transform 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={26} />
        </button>
      )}
    </div>
  );

  // ── Chat view ────────────────────────────────────────────────────────────────
  const renderChat = () => {
    const msgs = currentThread?.messages || [];
    const items = []; // interleave date separators

    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1];
      if (!prev || !isSameDay(prev.date, msg.date)) {
        items.push({ type: 'separator', ts: msg.date, key: 'sep_' + msg.date });
      }
      items.push({ type: 'msg', msg, key: msg.id || i });
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Scrollable messages */}
        <div
          ref={chatScrollRef}
          style={{
            flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            padding: '0.5rem 0.75rem 0.75rem',
            display: 'flex', flexDirection: 'column', gap: '2px'
          }}
        >
          {items.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '2rem', fontSize: '0.9rem' }}>Žádné zprávy v tomto vláknu.</div>
          )}
          {items.map(item => {
            if (item.type === 'separator') {
              return (
                <div key={item.key} style={{ textAlign: 'center', margin: '0.75rem 0 0.5rem', color: '#64748b', fontSize: '0.78rem', fontWeight: '500', letterSpacing: '0.3px' }}>
                  {formatDaySeparator(item.ts)}
                </div>
              );
            }
            const { msg } = item;
            const isOut = msg.type === 'outbound';
            return (
              <div key={item.key} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: '1px' }}>
                <div style={{
                  maxWidth: '78%',
                  background: isOut ? '#1a73e8' : '#1e293b',
                  color: 'white',
                  padding: '0.6rem 0.9rem',
                  borderRadius: isOut ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  fontSize: '0.975rem',
                  lineHeight: '1.45',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  wordBreak: 'break-word'
                }}>
                  <div>{msg.body}</div>
                  <div style={{
                    fontSize: '0.72rem',
                    color: isOut ? 'rgba(255,255,255,0.65)' : '#64748b',
                    textAlign: 'right',
                    marginTop: '3px'
                  }}>
                    {new Date(msg.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input bar */}
        <div style={{
          padding: '0.6rem 0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
          paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))',
          background: '#0f172a'
        }}>
          <textarea
            ref={textareaRef}
            placeholder="Odeslat zprávu SMS..."
            value={message}
            onChange={e => { setMessage(e.target.value); autoResize(e); }}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '22px',
              padding: '0.7rem 1rem', color: 'white', fontSize: '1rem',
              resize: 'none', outline: 'none', lineHeight: '1.4',
              minHeight: '42px', maxHeight: '120px', overflowY: 'auto',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            style={{
              background: message.trim() ? '#1a73e8' : 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: '50%',
              width: '44px', height: '44px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', cursor: message.trim() ? 'pointer' : 'default',
              transition: 'background 0.2s'
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  };

  // ── New message ──────────────────────────────────────────────────────────────
  const renderNew = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '0.75rem 1rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.75rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Komu:</span>
          <input
            type="tel"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="+420..."
            autoFocus
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '1rem' }}
          />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.9rem' }}>
        Napište zprávu níže
      </div>
      <div style={{
        padding: '0.6rem 0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
        paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))',
        background: '#0f172a'
      }}>
        <textarea
          ref={textareaRef}
          placeholder="Zpráva SMS..."
          value={message}
          onChange={e => { setMessage(e.target.value); autoResize(e); }}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '22px',
            padding: '0.7rem 1rem', color: 'white', fontSize: '1rem',
            resize: 'none', outline: 'none', lineHeight: '1.4',
            minHeight: '42px', maxHeight: '120px', overflowY: 'auto',
            fontFamily: 'inherit'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!recipient.trim() || !message.trim()}
          style={{
            background: recipient.trim() && message.trim() ? '#1a73e8' : 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: '50%',
            width: '44px', height: '44px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: recipient.trim() && message.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s'
          }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  // ── Root layout ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f172a', zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0 0.5rem',
        paddingTop: 'calc(0.6rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.6rem',
        background: '#131f35',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        minHeight: '56px'
      }}>
        {activeThread || isNewMsg ? (
          <button onClick={() => { setActiveThread(null); setIsNewMsg(false); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
            <ArrowLeft size={22} />
          </button>
        ) : (
          <div style={{ width: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <MessageSquare size={20} color="#1a73e8" />
          </div>
        )}

        {activeThread ? (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: avatarColor(activeThread.address), flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '700', fontSize: '0.8rem'
            }}>
              {getInitials(activeThread.address)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeThread.address}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>SMS</div>
            </div>
          </div>
        ) : (
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'white', flex: 1 }}>
            {isNewMsg ? 'Nová zpráva' : 'Zprávy'}
          </h3>
        )}

        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
          <X size={22} />
        </button>
      </div>

      {isNewMsg ? renderNew() : activeThread ? renderChat() : renderList()}
    </div>
  );
};

export default RelaySmsModal;
