import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNexus } from '../context/ContextHook';
import { useSocketBridge } from '../services/socketBridge';
import TeamChatPanel from './TeamChatPanel';

const LAST_SEEN_KEY = 'nexus_team_chat_last_seen';
const POS_KEY = 'nexus_team_chat_pos';       // uložená pozice plovoucího tlačítka
const HIDDEN_KEY = 'nexus_team_chat_hidden'; // uživatel tlačítko schoval
const FAB_SIZE = 52;
const EDGE = 12; // okrajová rezerva při clampu do viewportu

function clampPos(p) {
  if (!p || typeof window === 'undefined') return p;
  const maxX = window.innerWidth - FAB_SIZE - EDGE;
  const maxY = window.innerHeight - FAB_SIZE - EDGE;
  return {
    x: Math.max(EDGE, Math.min(p.x, Math.max(EDGE, maxX))),
    y: Math.max(EDGE, Math.min(p.y, Math.max(EDGE, maxY))),
  };
}

const ChatBubbleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function TeamChatFloat() {
  const { token, API_BASE, isLoggedIn, activeOperator, isMobile } = useNexus();
  const socket = useSocketBridge();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [unread, setUnread] = useState(0);
  const pollRef = useRef(null);
  const lastSeenRef = useRef(localStorage.getItem(LAST_SEEN_KEY) || new Date(0).toISOString());

  // Plovoucí tlačítko: volitelná uložená pozice + možnost schování.
  const [pos, setPos] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY));
      return (p && typeof p.x === 'number' && typeof p.y === 'number') ? clampPos(p) : null;
    } catch { return null; }
  });
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN_KEY) === '1');
  const [dragging, setDragging] = useState(false);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const btnRef = useRef(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, dx: 0, dy: 0 });

  // Po změně velikosti okna / rotaci udrž tlačítko uvnitř viewportu.
  // Listener připojíme jen jednou; handler no-opne, dokud není pozice nastavená.
  useEffect(() => {
    const onResize = () => setPos(p => (p ? clampPos(p) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = (e) => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return; // práh tap vs. drag
    if (!d.moved) { d.moved = true; setDragging(true); }
    const np = clampPos({ x: e.clientX - d.dx, y: e.clientY - d.dy });
    posRef.current = np; // synchronně, aby pointerup uložil aktuální pozici (ne o krok pozadu)
    setPos(np);
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    if (d.active && d.moved) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(posRef.current)); } catch { /* ignore */ }
    }
    d.active = false;
    setDragging(false);
    btnRef.current?.releasePointerCapture?.(e.pointerId);
  };

  const hideButton = () => {
    setHidden(true);
    setOpen(false);
    try { localStorage.setItem(HIDDEN_KEY, '1'); } catch { /* ignore */ }
  };
  const restoreButton = () => {
    setHidden(false);
    try { localStorage.removeItem(HIDDEN_KEY); } catch { /* ignore */ }
  };

  // Fetch unread count every 15s (only when chat is closed)
  const checkUnread = useCallback(async () => {
    if (!token || !API_BASE || open) return;
    try {
      const r = await axios.get(
        `${API_BASE}/team-chat/unread?since=${encodeURIComponent(lastSeenRef.current)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnread(r.data?.count || 0);
    } catch (_err) { /* silent */ }
  }, [token, API_BASE, open]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const t = setTimeout(checkUnread, 0);
    pollRef.current = setInterval(checkUnread, 15000);
    return () => { clearTimeout(t); clearInterval(pollRef.current); };
  }, [checkUnread, isLoggedIn]);

  // Socket.io: live unread bump when chat is closed
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (open) return; // chat is open, no badge needed
      if (data.message?.author?.id === activeOperator?.id) return; // own message
      setUnread(prev => prev + 1);
    };
    socket.on('team_chat_message', handler);
    return () => socket.off('team_chat_message', handler);
  }, [socket, open, activeOperator?.id]);

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

  // Schované tlačítko → jen tenký vracecí úchyt na pravém okraji.
  if (hidden) {
    return (
      <button
        onClick={restoreButton}
        data-testid="team-chat-restore"
        title="Zobrazit týmový chat"
        aria-label="Zobrazit týmový chat"
        style={{
          position: 'fixed',
          right: 0,
          bottom: isMobile ? '120px' : '38%',
          width: 20,
          height: 46,
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          border: '1px solid rgba(59,130,246,0.3)',
          borderRight: 'none',
          background: 'rgba(59,130,246,0.18)',
          color: 'var(--accent-color)',
          cursor: 'pointer',
          zIndex: 9001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        💬
      </button>
    );
  }

  // Bottom offset: on mobile avoid bottom nav, on desktop give breathing room
  const bottomOffset = isMobile ? '90px' : '28px';
  const rightOffset = '20px';
  // Uložená pozice má přednost; jinak výchozí ukotvení vpravo dole.
  const anchorStyle = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : { bottom: bottomOffset, right: rightOffset };

  const handleFabClick = () => {
    if (drag.current.moved) { drag.current.moved = false; return; } // právě proběhl drag → neotvírat
    (open ? handleClose : handleOpen)();
  };

  return (
    <>
      {/* ── Chat Panel ── */}
      {open && (
        <div data-testid="team-chat-panel" style={{
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
          // Ve výchozí poloze panel vyrůstá z rohu u ikonky; když je FAB přetažený
          // jinam, použijeme neutrální střed (panel zůstává ukotvený vpravo dole
          // kvůli bezpečnému umístění ve viewportu).
          transformOrigin: pos ? 'center' : 'bottom right',
          willChange: 'transform, opacity, filter',
          animation: 'chatPanelIn 0.36s cubic-bezier(0.22, 1.12, 0.36, 1) both',
        }}>
          <TeamChatPanel
            onClose={handleClose}
            onMinimize={handleMinimize}
          />
        </div>
      )}

      {/* ── Floating Button (drag to move; × sibling to hide) ── */}
      <div style={{ position: 'fixed', ...anchorStyle, width: FAB_SIZE, height: FAB_SIZE, zIndex: 9001 }}>
        <button
          ref={btnRef}
          onClick={handleFabClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid="team-chat-float-btn"
          title="Týmový chat (táhni pro přesun)"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: 'none',
            background: open
              ? 'rgba(59,130,246,0.2)'
              : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            boxShadow: open
              ? '0 4px 20px rgba(59,130,246,0.2)'
              : '0 4px 20px rgba(59,130,246,0.4), 0 0 0 1px rgba(59,130,246,0.3)',
            transition: dragging ? 'none' : 'background 0.2s, box-shadow 0.2s',
            transform: open ? 'scale(0.9) rotate(10deg)' : 'scale(1)',
          }}
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

        {/* × schovat — samostatné tlačítko (validní HTML, klávesnicově ovladatelné) */}
        {!open && (
          <button
            onClick={hideButton}
            data-testid="team-chat-hide"
            aria-label="Schovat týmový chat"
            title="Schovat"
            style={{
              position: 'absolute',
              top: -6, left: -6,
              width: 20, height: 20,
              borderRadius: '50%',
              background: '#0d1018',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', lineHeight: 1, cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

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
          0%   { opacity: 0; transform: scale(0.62) translateY(10px); filter: blur(7px); }
          55%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes chatPanelIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
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
