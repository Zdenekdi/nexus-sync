import React from 'react';

const GlobalAppStyles = () => {
  return (
    <style>{`
      .fade-in { animation: fadeIn 0.4s ease-out; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .unread-badge { margin-left: auto; background: var(--_err-color); color: white; font-size: 0.7rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
      .avatar-circle { width: 48px; height: 48px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; alignItems: center; justifyContent: center; }
      .message-bubble-in { 
        align-self: flex-start; 
        max-width: 78%;
        background: rgba(255, 255, 255, 0.07); 
        padding: 0.65rem 0.95rem; 
        border-radius: 4px 18px 18px 18px; 
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        font-size: 0.93rem;
        line-height: 1.4;
        word-break: break-word;
      }
      .message-bubble-out { 
        align-self: flex-end; 
        max-width: 78%;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        padding: 0.65rem 0.95rem; 
        border-radius: 18px 4px 18px 18px; 
        color: white;
        font-size: 0.93rem;
        line-height: 1.4;
        box-shadow: 0 2px 8px rgba(99,102,241,0.35);
        word-break: break-word;
      }
      @media (max-width: 768px) {
        .message-bubble-in, .message-bubble-out {
          max-width: 82%;
          padding: 0.55rem 0.8rem;
          font-size: 0.88rem;
        }
      }
      .suggestion-chip { background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); color: var(--text-secondary); padding: 0.6rem 1rem; borderRadius: 12px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
      .suggestion-chip:hover { background: rgba(59, 130, 246, 0.1); border-color: var(--accent-color); color: white; }
      .status-badge-small { font-size: 0.75rem; padding: 0.2rem 0.5rem; border: 1px solid var(--card-border); border-radius: 6px; display: inline-flex; }
      .hash-code { font-size: 0.8rem; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; }
      .dot { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; background: var(--accent-color); border-radius: 50%; box-shadow: 0 0 10px var(--accent-glow); animation: dotPulse 2s infinite ease-in-out; z-index: 2; }
      @keyframes dotPulse { 0% { transform: translateY(-50%) scale(1); opacity: 1; } 50% { transform: translateY(-50%) scale(1.3); opacity: 0.7; } 100% { transform: translateY(-50%) scale(1); opacity: 1; } }
      .conversation-item { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); border-left: 4px solid transparent; }
      .conversation-item:hover { background: rgba(255,255,255,0.03) !important; transform: translateX(4px); }
      .conversation-item.active { border-left-color: var(--accent-color); background: rgba(59, 130, 246, 0.1) !important; }
      .conversation-item.unread { background: rgba(59, 130, 246, 0.04); }
      .truncate-text { font-size: 0.9rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; WebkitLineClamp: 1; WebkitBoxOrient: vertical; transition: color 0.2s; }
      .incoming-call-popup { position: fixed; bottom: 3rem; right: 3rem; z-index: 1000; width: 400px; }
      .incoming-card { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(20px); border: 1px solid var(--accent-color); padding: 1.5rem; border-radius: 24px; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 0 20px var(--accent-glow); }
      .avatar-pulse { width: 56px; height: 56px; background: var(--accent-color); border-radius: 16px; display: flex; align-items: center; justify-content: center; animation: ringPulse 2s infinite; }
      @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
      .circle-btn { width: 44px; height: 44px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .circle-btn.decline { background: var(--_err-color); color: white; }
      .circle-btn.accept { background: var(--success-color); color: white; }

      select::-ms-expand { display: none; }
      select { -webkit-appearance: none; appearance: none; }

      .action-btn.active { background: rgba(239, 68, 68, 0.1) !important; color: var(--_err-color) !important; border-color: var(--_err-color) !important; }

      .toggle-switch.active { box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
      .toggle-switch:hover { border-color: var(--accent-color) !important; }

      /* Core App Layout and Safe Areas */
      .nexus-app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: #080a0f;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        padding-right: env(safe-area-inset-right, 0px);
      }
    `}</style>
  );
};

export default GlobalAppStyles;
