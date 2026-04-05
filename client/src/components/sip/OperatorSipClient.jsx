/**
 * OperatorSipClient.jsx — Web SIP klient pro operátory (JsSIP + WebRTC)
 *
 * Integrace:
 *   <OperatorSipClient
 *     wsUrl="wss://78.141.202.139:8089"
 *     username="op1"
 *     password="heslo"
 *     onIncoming={(session) => ...}
 *     onEnded={() => ...}
 *   />
 *
 * Stav SIP registrace je dostupný přes prop `onStatusChange`:
 *   onStatusChange({ status: 'connected'|'registered'|'failed'|'disconnected', msg })
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import JsSIP from 'jssip';

// Potlač JsSIP debug logy v produkci
if (import.meta.env.PROD) JsSIP.debug.disable('JsSIP:*');
else                       JsSIP.debug.enable('JsSIP:*');

export default function OperatorSipClient({
  wsUrl,
  username,
  password,
  onIncoming,
  onEnded,
  onStatusChange,
  onAnswered,
}) {
  const uaRef          = useRef(null);
  const sessionRef     = useRef(null);
  const [status, setStatus] = useState('idle');

  const notifyStatus = useCallback((s, msg = '') => {
    setStatus(s);
    onStatusChange?.({ status: s, msg });
  }, [onStatusChange]);

  // ── Inicializace UA ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!wsUrl || !username || !password) return;

    // Ukonči předchozí spojení
    if (uaRef.current) {
      try { uaRef.current.stop(); } catch (_unused) {}
    }

    const socket = new JsSIP.WebSocketInterface(wsUrl);
    const config = {
      sockets:            [socket],
      uri:                `sip:${username}@${new URL(wsUrl).hostname}`,
      password,
      register:           true,
      register_expires:   300,
      connection_recovery_min_interval: 5,
      connection_recovery_max_interval: 30,
    };

    const ua = new JsSIP.UA(config);
    uaRef.current = ua;

    // ── Événements UA ───────────────────────────────────────────────────────
    ua.on('connecting', () => notifyStatus('connecting'));
    ua.on('connected',  () => notifyStatus('connected'));
    ua.on('disconnected', (e) => notifyStatus('disconnected', e?.cause || ''));
    ua.on('registered',   () => notifyStatus('registered'));
    ua.on('unregistered', () => notifyStatus('idle'));
    ua.on('registrationFailed', (e) => notifyStatus('failed', e?.cause || ''));

    // ── Příchozí hovor ──────────────────────────────────────────────────────
    ua.on('newRTCSession', ({ session, originator }) => {
      if (originator !== 'remote') return;
      sessionRef.current = session;

      const callerId   = session.remote_identity?.uri?.user || 'Neznámé číslo';
      const callerName = session.remote_identity?.display_name || callerId;

      // Přečti X-Model-Name hlavičku přidanou Asteriskem (jméno modelky)
      let targetModel    = null;
      let relayExtension = null;
      try {
        targetModel    = session.request?.getHeader('X-Model-Name')    || null;
        relayExtension = session.request?.getHeader('X-Relay-Extension') || null;
      } catch (_unused) {}

      onIncoming?.({ session, callerId, callerName, targetModel, relayExtension });

      session.on('ended',   () => { sessionRef.current = null; onEnded?.(); });
      session.on('failed',  () => { sessionRef.current = null; onEnded?.(); });
      session.on('accepted', () => onAnswered?.({ callerId, callerName, targetModel }));
    });

    ua.start();

    return () => {
      try { ua.stop(); } catch (_unused) {}
    };
  }, [wsUrl, username, password]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Akce ─────────────────────────────────────────────────────────────────

  const answer = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });
  }, []);

  const reject = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    try { session.terminate({ status_code: 486 }); } catch (_unused) {}
    sessionRef.current = null;
  }, []);

  const hangup = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    try { session.terminate(); } catch (_unused) {}
    sessionRef.current = null;
  }, []);

  const mute = useCallback((muted) => {
    const session = sessionRef.current;
    if (!session) return;
    if (muted) session.mute();
    else        session.unmute();
  }, []);

  // Hook exposuje kontrolní funkce přes ref — komponenta je neviditelná
  return { status, answer, reject, hangup, mute };
}

// ── Custom hook ───────────────────────────────────────────────────────────────

/**
 * useOperatorSip(config, handlers)
 *
 * config = { wsUrl, username, password }
 *   wsUrl: 'wss://IP:8089' nebo 'ws://IP:8088' (testovací)
 *
 * handlers = { onIncoming, onEnded, onAnswered, onStatusChange }
 */
export function useOperatorSip(config, handlers = {}) {
  const [sipStatus,    setSipStatus]    = useState('idle');
  const [callSession,  setCallSession]  = useState(null); // { callerId, callerName, session }
  const [activeCall,   setActiveCall]   = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted,      setIsMuted]      = useState(false);

  const uaRef      = useRef(null);
  const sessionRef = useRef(null);
  const timerRef   = useRef(null);

  useEffect(() => {
    if (!config?.wsUrl || !config?.username || !config?.password) return;

    if (uaRef.current) {
      try { uaRef.current.stop(); } catch (_unused) {}
    }

    if (import.meta.env.PROD) JsSIP.debug.disable('JsSIP:*');

    const socket = new JsSIP.WebSocketInterface(config.wsUrl);
    const domain = (() => { try { return new URL(config.wsUrl).hostname; } catch { return 'asterisk'; } })();

    const ua = new JsSIP.UA({
      sockets:  [socket],
      uri:      `sip:${config.username}@${domain}`,
      password: config.password,
      register: true,
      register_expires: 300,
      connection_recovery_min_interval: 5,
      connection_recovery_max_interval: 30,
    });
    uaRef.current = ua;

    const updateStatus = (s) => { setSipStatus(s); handlers.onStatusChange?.(s); };

    ua.on('connecting',          () => updateStatus('connecting'));
    ua.on('connected',           () => updateStatus('connected'));
    ua.on('registered',          () => updateStatus('registered'));
    ua.on('unregistered',        () => updateStatus('idle'));
    ua.on('disconnected', (e)    => updateStatus('disconnected'));
    ua.on('registrationFailed',  () => updateStatus('failed'));

    ua.on('newRTCSession', ({ session, originator }) => {
      if (originator !== 'remote') return;
      sessionRef.current = session;

      // Extrahuj jméno modelky z Asterisk SIP hlavičky
      let targetModel    = null;
      let relayExtension = null;
      try {
        targetModel    = session.request?.getHeader('X-Model-Name')     || null;
        relayExtension = session.request?.getHeader('X-Relay-Extension') || null;
      } catch (_unused) {}

      const info = {
        callerId:      session.remote_identity?.uri?.user || 'Neznámé',
        callerName:    session.remote_identity?.display_name || '',
        targetModel,   // jméno modelky — z Asterisk X-Model-Name
        relayExtension, // např. "relay1"
        session,
      };
      setCallSession(info);
      handlers.onIncoming?.(info);

      session.on('accepted', () => {
        setCallDuration(0);
        setActiveCall(info);
        setCallSession(null);
        timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
        handlers.onAnswered?.(info);
      });

      session.on('ended',  () => cleanup());
      session.on('failed', () => cleanup());
    });

    ua.start();
    return () => { try { ua.stop(); } catch (_unused) {} clearInterval(timerRef.current); };
  }, [config?.wsUrl, config?.username, config?.password]); // eslint-disable-line

  const cleanup = () => {
    clearInterval(timerRef.current);
    sessionRef.current = null;
    setCallSession(null);
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    handlers.onEnded?.();
  };

  const answer = useCallback(() => {
    sessionRef.current?.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });
  }, []);

  const reject = useCallback(() => {
    try { sessionRef.current?.terminate({ status_code: 486 }); } catch (_unused) {}
    cleanup();
  }, []); // eslint-disable-line

  const hangup = useCallback(() => {
    try { sessionRef.current?.terminate(); } catch (_unused) {}
    cleanup();
  }, []); // eslint-disable-line

  const toggleMute = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    const next = !isMuted;
    if (next) sess.mute(); else sess.unmute();
    setIsMuted(next);
  }, [isMuted]);

  return {
    sipStatus,    // 'idle'|'connecting'|'connected'|'registered'|'failed'|'disconnected'
    callSession,  // { callerId, callerName, session } | null — příchozí, čeká na přijetí
    activeCall,   // { callerId, callerName } | null — aktivní hovor
    callDuration, // sekundy
    isMuted,
    answer,
    reject,
    hangup,
    toggleMute,
  };
}
