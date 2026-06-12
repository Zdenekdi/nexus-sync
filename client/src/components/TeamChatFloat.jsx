import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNexus } from '../context/ContextHook';
import TeamChatPanel from './TeamChatPanel';

const LAST_SEEN_KEY = 'nexus_team_chat_last_seen';

const ChatBubbleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function TeamChatFloat() {
  const { token, API_BASE, isLoggedIn, activeOperator, isMobile } = useNexus();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [unread, setUnread] = useState(0);
  const pollRef = useRef(null);
  const lastSeenRef = useRef(localStorage.getItem(LAST_SEEN_KEY) || new Date(0).toISOString());

  // Fetch unread count every 15s (only when chat is closed)
  const checkUnread = useCallback(async () => {
    if (!token || !API_BASE || open) return;
    try {
      const r = await axios.get(
        `${API_BASE}/team-chat/unread?since=${encodeURIComponent(lastSeenRef.current)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnread(r.data?.count || 0);
    } catch (_) {}
  }, [token, API_BASE, open]);

  useEffect(() => {
    if (!isLoggedIn) return;
    checkUnread();
    pollRef.current = setInterval(checkUnread, 15000);
    return () => clearInterval(pollRef.current);
  }, [checkUnread, isLoggedIn]);

  // Socket.io: live unread bump when chat is closed
  useEffect(() => {
    const socket = window._nexusSocket;
    if (!socket) return;
    const handler = (data) => {
      if (open) return; // chat is open, no badge needed
      if (data.message?.author?.id === activeOperator?.id) return; // own message
      setUnread(prev => prev + 1);
    };
    socket.on('team_chat_message', handler);
    return () => socket.off('team_chat_message', handler);
  }, [open, activeOperator?.id]);

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setUnread(0);
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    localStorage.setItem(LAST_SEEN_KEY, now);
  };

  const handleClose = () => {
    setOpen(false);
    setMinimized(false);
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    localStorage.setItem(LAST_SEEN_KEY, now);
  };

  const handleMinimize = () => {
    setMinimized(true);
    setOpen(false);
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    localStorage.setItem(LAST_SEEN_KEY, now);
  };

  if (!isLoggedIn) return null;

  // Bottom offset: on mobile avoid bottom nav, on desktop give breathing room
  const bottomOffset = isMobile ? '90px' : '28px';
  const rightOffset = '20px';

  return (
    <>
      {/* ── Chat Panel ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '88px',
          right: rightOffset,
          width: isMobile ? 'calc(100vw - 32px)' : '380px',
          maxWidth: '95vw',
          height: isMobile ? 'calc(100dvh - 160px)' : '520px',
          background: '#0d1018',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatPanelIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <TeamChatPanel
            onClose={handleClose}
            onMinimize={handleMinimize}
          />
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={open ? handleClose : handleOpen}
        data-testid="team-chat-float-btn"
        title="Týmový chat"
        style={{
          position: 'fixed',
          bottom: bottomOffset,
          right: rightOffset,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: open
            ? 'rgba(59,130,246,0.2)'
            : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9001,
          boxShadow: open
            ? '0 4px 20px rgba(59,130,246,0.2)'
            : '0 4px 20px rgba(59,130,246,0.4), 0 0 0 1px rgba(59,130,246,0.3)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: open ? 'scale(0.9) rotate(10deg)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <ChatBubbleIcon />

        {/* Unread badge */}
        {unread > 0 && !open && (
          <div style={{
            position: 'absolute',
            top: -3, right: -3,
            minWidth: 18, height: 18,
            background: '#ef4444',
            borderRadius: 9,
            border: '2px solid #0d1018',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 800, color: '#fff',
            padding: '0 4px',
            animation: 'badgePop 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
          }}>
            {unread > 99 ? '99+' : unread}
          </div>
        )}

        {/* Pulse ring when there are unread messages */}
        {unread > 0 && !open && (
          <div style={{
            position: 'absolute', inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(239,68,68,0.4)',
            animation: 'chatPulseRing 2s infinite',
            pointerEvents: 'none',
          }} />
        )}
      </button>

      {/* Minimized chip */}
      {minimized && !open && (
        <button
          onClick={handleOpen}
          style={{
            position: 'fixed',
            bottom: isMobile ? '90px' : '88px',
            right: '80px',
            padding: '0.5rem 1rem',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 20,
            color: 'var(--accent-color)',
            fontWeight: 700, fontSize: '0.8rem',
            cursor: 'pointer',
            zIndex: 9001,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'chatPanelIn 0.2s ease',
          }}
        >
          💬 Chat
        </button>
      )}

      <style>{`
        @keyframes chatPanelIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes badgePop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        @keyframes chatPulseRing {
          0% { transform: scale(0.9); opacity: 0.6; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(0.9); opacity: 0; }
        }
      `}</style>
    </>
  );
}
