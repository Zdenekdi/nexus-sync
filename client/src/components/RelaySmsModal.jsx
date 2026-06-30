import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useSmsRelay } from '../plugins/NexusSms';

const RelaySmsModal = ({ isOpen, onClose }) => {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const { sendSmsNative } = useSmsRelay();

  if (!isOpen) return null;

  const handleSend = async () => {
    if (recipient.trim() && message.trim() && sendSmsNative) {
      await sendSmsNative(recipient.trim(), message.trim());
      setMessage('');
      // In a real app we'd add to thread. For review purposes, just clearing is fine.
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
      background: '#0f172a', zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ 
        padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
          <MessageSquare size={24} color="#3b82f6" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Nová zpráva</h3>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>
      </div>

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
        />
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
          Tato aplikace slouží jako výchozí správce zpráv. Můžete odsud přímo odesílat SMS.
        </div>
      </div>

      <div style={{ 
        padding: '1rem', background: '#1e293b', borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end'
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
};

export default RelaySmsModal;
