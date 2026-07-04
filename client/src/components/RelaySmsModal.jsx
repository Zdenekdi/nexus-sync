import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ArrowLeft, Plus, User, Loader2, AlertCircle } from 'lucide-react';
import { useSmsRelay } from '../plugins/NexusSms';
import { registerPlugin } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const NexusRelayPlugin = registerPlugin('NexusRelay', { web: {} });

const RelaySmsModal = ({ isOpen, onClose }) => {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isNewMsg, setIsNewMsg] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  
  const { sendSmsNative, incomingSms } = useSmsRelay();
  const chatEndRef = useRef(null);

  // Handle hardware back button: chat → list → close modal
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
    if (isOpen) {
      loadHistory();
    } else {
      setActiveThread(null);
      setIsNewMsg(false);
      setRecipient('');
      setMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    // When a new SMS arrives via interceptor
    if (incomingSms && isOpen) {
      loadHistory(); // Reload everything to get the latest DB state
    }
  }, [incomingSms, isOpen]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      // Only load last 90 days to avoid old messages crowding out new ones
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const res = await NexusRelayPlugin.getSmsHistory({ lastTimestamp: ninetyDaysAgo, limit: 5000 });
      if (res && res.messages) {
        // Group by address
        const groups = {};
        res.messages.forEach(msg => {
          let addr = msg.address;
          if (!addr) return;
          
          // Normalize number to prevent splitting threads for the same contact
          addr = addr.replace(/[\\s\\-\\(\\)]/g, '');
          if (addr.startsWith('00')) addr = '+' + addr.substring(2);
          if (addr.length === 9 && !addr.startsWith('+')) {
            addr = '+420' + addr; // Default to CZ prefix if 9 digits
          }
          // Assign normalized address back for consistent display
          msg.normalizedAddress = addr;
          
          if (!groups[addr]) {
            groups[addr] = {
              address: addr,
              messages: [],
              lastDate: msg.date
            };
          }
          groups[addr].messages.push(msg);
          if (msg.date > groups[addr].lastDate) {
            groups[addr].lastDate = msg.date;
          }
        });
        
        // Sort threads by latest message
        const sortedThreads = Object.values(groups).sort((a, b) => b.lastDate - a.lastDate);
        // Sort messages inside threads oldest -> newest
        sortedThreads.forEach(t => t.messages.sort((a, b) => a.date - b.date));
        
        setThreads(sortedThreads);
      }
    } catch (err) {
      console.error("Failed to load SMS history", err);
      setLoadError(err?.message || 'Nepodařilo se načíst SMS historii. Aplikace musí být výchozí SMS aplikací nebo mít povolena READ_SMS oprávnění.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeThread) scrollToBottom();
  }, [activeThread, threads]);

  if (!isOpen) return null;

  const currentThreadData = activeThread 
    ? threads.find(t => t.address === activeThread.address) || { address: activeThread.address, messages: [] }
    : null;

  const handleSend = async () => {
    const target = isNewMsg ? recipient.trim() : activeThread?.address;
    if (target && message.trim() && sendSmsNative) {
      const msgText = message.trim();
      setMessage(''); // Optimistic clear
      
      // Optimistic message append
      const optimisticMsg = {
        id: 'opt_' + Date.now(),
        address: target,
        body: msgText,
        date: Date.now(),
        type: 'outbound'
      };
      
      let newThreads = [...threads];
      let tIdx = newThreads.findIndex(t => t.address === target);
      if (tIdx === -1) {
        newThreads.unshift({
          address: target,
          messages: [optimisticMsg],
          lastDate: optimisticMsg.date
        });
      } else {
        newThreads[tIdx].messages.push(optimisticMsg);
        newThreads[tIdx].lastDate = optimisticMsg.date;
        newThreads.sort((a, b) => b.lastDate - a.lastDate);
      }
      setThreads(newThreads);
      
      if (isNewMsg) {
        setIsNewMsg(false);
        setActiveThread({ address: target });
      }

      await sendSmsNative(target, msgText);
      // Reload shortly to get real ID
      setTimeout(loadHistory, 1000);
    }
  };

  const renderThreadList = () => (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', color: '#64748b' }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : loadError ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={32} />
          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{loadError}</div>
          <button onClick={loadHistory} style={{ padding: '0.5rem 1.25rem', background: '#3b82f6', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer' }}>Zkusit znovu</button>
        </div>
      ) : threads.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          Žádné SMS zprávy.
        </div>
      ) : (
        threads.map(thread => {
          const lastMsg = thread.messages[thread.messages.length - 1];
          const isUnread = lastMsg.type === 'inbound' && !lastMsg.read;
          return (
            <div 
              key={thread.address}
              onClick={() => setActiveThread({ address: thread.address })}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
                background: 'transparent', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', background: '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1'
              }}>
                <User size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {thread.address}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(thread.lastDate).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ color: isUnread ? 'white' : '#94a3b8', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lastMsg.type === 'outbound' && <span style={{ marginRight: '4px' }}>Vy:</span>}
                  {lastMsg.body}
                </div>
              </div>
            </div>
          );
        })
      )}
      
      {!loading && (
        <button 
          onClick={() => setIsNewMsg(true)}
          style={{
            position: 'absolute', right: '2rem',
            bottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
            width: '56px', height: '56px', borderRadius: '50%', background: '#3b82f6',
            border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', cursor: 'pointer', zIndex: 10
          }}
        >
          <Plus size={28} />
        </button>
      )}
    </div>
  );

  const renderChat = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', minHeight: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {currentThreadData?.messages.map((msg, i) => {
          const isOutbound = msg.type === 'outbound';
          return (
            <div key={msg.id || i} style={{
              alignSelf: isOutbound ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              background: isOutbound ? '#3b82f6' : '#1e293b',
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              borderBottomRightRadius: isOutbound ? '4px' : '16px',
              borderBottomLeftRadius: isOutbound ? '16px' : '4px',
              color: 'white',
              fontSize: '1rem',
              lineHeight: '1.4',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              <div>{msg.body}</div>
              <div style={{ fontSize: '0.7rem', color: isOutbound ? 'rgba(255,255,255,0.7)' : '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
                {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div style={{ 
        padding: '1rem', background: '#1e293b', borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
      }}>
        <textarea 
          placeholder="Nová zpráva..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '0.75rem 1rem', color: 'white',
            fontSize: '1rem', resize: 'none', outline: 'none', minHeight: '24px', maxHeight: '120px'
          }}
          rows={1}
        />
        <button 
          onClick={handleSend}
          disabled={!message.trim()}
          style={{
            background: message.trim() ? '#3b82f6' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '50%',
            width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: message.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s', flexShrink: 0
          }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  const renderNewMessage = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <input 
          type="tel"
          placeholder="Komu: +420..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: 'white', fontSize: '1.1rem', outline: 'none',
            padding: '0.5rem 0'
          }}
          autoFocus
        />
      </div>
      
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
          Zadejte telefonní číslo příjemce a napište zprávu.
        </div>
      </div>

      <div style={{ 
        padding: '1rem', background: '#1e293b', borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
      }}>
        <textarea 
          placeholder="Zpráva..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '0.75rem 1rem', color: 'white',
            fontSize: '1rem', resize: 'none', outline: 'none', minHeight: '24px', maxHeight: '120px'
          }}
          rows={1}
        />
        <button 
          onClick={handleSend}
          disabled={!recipient.trim() || !message.trim()}
          style={{
            background: recipient.trim() && message.trim() ? '#3b82f6' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '50%',
            width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: recipient.trim() && message.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s', flexShrink: 0
          }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
      background: '#0f172a', zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ 
        padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
        background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))'
      }}>
        {activeThread || isNewMsg ? (
          <button onClick={() => { setActiveThread(null); setIsNewMsg(false); }} style={{
            background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer'
          }}>
            <ArrowLeft size={24} />
          </button>
        ) : (
          <MessageSquare size={24} color="#3b82f6" />
        )}
        
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'white', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isNewMsg ? 'Nová zpráva' : activeThread ? activeThread.address : 'Zprávy'}
        </h3>
        
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>
      </div>

      {isNewMsg ? renderNewMessage() : activeThread ? renderChat() : renderThreadList()}
    </div>
  );
};

export default RelaySmsModal;
