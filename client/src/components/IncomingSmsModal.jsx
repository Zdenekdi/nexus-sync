import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Reply, Phone, Clock } from 'lucide-react';

/**
 * IncomingSmsModal
 * Zobrazuje příchozí SMS přeposlané ze salon telefonu.
 * Používá se jak v nexusRelay tak nexusFull variantě.
 *
 * Props:
 *   sms        { from, body, timestamp } | null
 *   onClose    () => void
 *   onReply    (replyText: string) => void  — odešle odpověď zpět přes relay
 *   lang       'cz' | 'en'
 */
export default function IncomingSmsModal({ sms, onClose, onReply, lang = 'cz' }) {
  const [replyText, setReplyText]   = useState('');
  const [showReply, setShowReply]   = useState(false);
  const [sending, setSending]       = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const textareaRef                 = useRef(null);

  // Počítadlo sekund od přijetí
  useEffect(() => {
    if (!sms) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [sms]);

  // Fokus na textarea při otevření odpovědi
  useEffect(() => {
    if (showReply) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [showReply]);

  if (!sms) return null;

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await onReply?.(replyText.trim());
      setReplyText('');
      setShowReply(false);
      onClose?.();
    } finally {
      setSending(false);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: 'min(420px, 92vw)',
        background: 'linear-gradient(135deg, rgba(17,24,39,0.98), rgba(30,20,50,0.98))',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.1)',
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Hlavička */}
        <div style={{
          padding: '1.25rem 1.5rem 1rem',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.08))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          {/* Animovaná ikona */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            animation: 'pulse 1.5s ease infinite',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>
            <MessageSquare size={20} color="white" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'rgba(167,139,250,0.8)', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>
              {lang === 'cz' ? '📨 PŘÍCHOZÍ SMS' : '📨 INCOMING SMS'}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'white', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sms.from}
            </div>
          </div>

          {/* Čas od přijetí */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            <Clock size={12} />
            <span>{formatTime(elapsed)}</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tělo zprávy */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '1rem 1.1rem',
            fontSize: '0.88rem',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6,
            maxHeight: '160px',
            overflowY: 'auto',
            wordBreak: 'break-word',
            marginBottom: '1rem',
          }}>
            {sms.body || <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>(prázdná zpráva)</span>}
          </div>

          {/* Pole pro odpověď */}
          {showReply && (
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                placeholder={lang === 'cz' ? 'Napište odpověď...' : 'Write a reply...'}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: 'white', fontSize: '0.85rem',
                  resize: 'none', outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem', textAlign: 'right' }}>
                Ctrl+Enter {lang === 'cz' ? 'pro odeslání' : 'to send'}
              </div>
            </div>
          )}

          {/* Tlačítka */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {!showReply ? (
              <>
                <button
                  onClick={() => setShowReply(true)}
                  style={{
                    flex: 1, padding: '0.7rem',
                    borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: 'white', fontWeight: '800', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
                  }}
                >
                  <Reply size={15} />
                  {lang === 'cz' ? 'Odpovědět' : 'Reply'}
                </button>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '0.7rem',
                    borderRadius: '12px', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: '800', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  <X size={15} />
                  {lang === 'cz' ? 'Zavřít' : 'Dismiss'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || sending}
                  style={{
                    flex: 1, padding: '0.7rem',
                    borderRadius: '12px', border: 'none',
                    cursor: !replyText.trim() || sending ? 'not-allowed' : 'pointer',
                    background: !replyText.trim() || sending
                      ? 'rgba(124,58,237,0.3)'
                      : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: 'white', fontWeight: '800', fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  {sending ? '...' : (lang === 'cz' ? 'Odeslat' : 'Send')}
                </button>
                <button
                  onClick={() => { setShowReply(false); setReplyText(''); }}
                  style={{
                    padding: '0.7rem 1rem',
                    borderRadius: '12px', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: '800', fontSize: '0.82rem',
                  }}
                >
                  {lang === 'cz' ? 'Zpět' : 'Back'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -46%) } to { opacity: 1; transform: translate(-50%, -50%) } }
        @keyframes pulse   { 0%,100% { box-shadow: 0 0 20px rgba(124,58,237,0.4) } 50% { box-shadow: 0 0 35px rgba(124,58,237,0.7) } }
      `}</style>
    </>
  );
}
