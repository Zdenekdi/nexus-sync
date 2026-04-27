import { useState, useRef, useEffect, useCallback } from 'react';
import JsSIP from 'jssip';

/**
 * useOperatorSip(config, handlers)
 *
 * config = { wsUrl, username, password }
 *   wsUrl: 'wss://IP:8089' nebo 'ws://IP:8088' (testovací)
 *
 * handlers = { onIncoming, onEnded, onAnswered, onStatusChange }
 */
export function useOperatorSip(config, handlers = {}) {
  const [sipStatus, setSipStatus] = useState('idle');
  const [callSession, setCallSession] = useState(null); // { callerId, callerName, session }
  const [activeCall, setActiveCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const uaRef = useRef(null);
  const sessionRef = useRef(null);
  const timerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    sessionRef.current = null;
    setCallSession(null);
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    handlers.onEnded?.();
  }, [handlers]);

  useEffect(() => {
    if (!config?.wsUrl || !config?.username || !config?.password) return;

    if (uaRef.current) {
      try { uaRef.current.stop(); } catch { /* ignore stop _err */ }
    }

    if (import.meta.env.PROD) JsSIP.debug.disable('JsSIP:*');

    const socket = new JsSIP.WebSocketInterface(config.wsUrl);
    const domain = (() => { try { return new URL(config.wsUrl).hostname; } catch { return 'asterisk'; } })();

    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${config.username}@${domain}`,
      password: config.password,
      register: true,
      register_expires: 300,
      connection_recovery_min_interval: 5,
      connection_recovery_max_interval: 30,
    });
    uaRef.current = ua;

    const updateStatus = (s) => { 
      setSipStatus(s); 
      handlers.onStatusChange?.(s); 
    };

    ua.on('connecting', () => updateStatus('connecting'));
    ua.on('connected', () => updateStatus('connected'));
    ua.on('registered', () => updateStatus('registered'));
    ua.on('unregistered', () => updateStatus('idle'));
    ua.on('disconnected', () => updateStatus('disconnected'));
    ua.on('registrationFailed', () => updateStatus('failed'));

    ua.on('newRTCSession', ({ session, originator }) => {
      if (originator !== 'remote') return;
      sessionRef.current = session;

      // Extrahuj jméno modelky z Asterisk SIP hlavičky
      let targetModel = null;
      let relayExtension = null;
      try {
        targetModel = session.request?.getHeader('X-Model-Name') || null;
        relayExtension = session.request?.getHeader('X-Relay-Extension') || null;
      } catch { /* ignore header errors */ }

      const info = {
        callerId: session.remote_identity?.uri?.user || 'Neznámé',
        callerName: session.remote_identity?.display_name || '',
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
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
        handlers.onAnswered?.(info);
      });

      session.on('ended', () => cleanup());
      session.on('failed', () => cleanup());
    });

    ua.start();
    return () => { 
      try { ua.stop(); } catch { /* ignore stop _err */ } 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [config?.wsUrl, config?.username, config?.password, cleanup, handlers]);

  const answer = useCallback(() => {
    sessionRef.current?.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });
  }, []);

  const reject = useCallback(() => {
    try { sessionRef.current?.terminate({ status_code: 486 }); } catch { /* ignore terminate _err */ }
    cleanup();
  }, [cleanup]);

  const hangup = useCallback(() => {
    try { sessionRef.current?.terminate(); } catch { /* ignore terminate _err */ }
    cleanup();
  }, [cleanup]);

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
