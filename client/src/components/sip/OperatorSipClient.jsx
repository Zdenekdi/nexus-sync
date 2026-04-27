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
      try { uaRef.current.stop(); } catch { /* ignore stop _err */ }
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
    ua.on('disconnected', (_err) => notifyStatus('disconnected', _err?.cause || ''));
    ua.on('registered',   () => notifyStatus('registered'));
    ua.on('unregistered', () => notifyStatus('idle'));
    ua.on('registrationFailed', (_err) => notifyStatus('failed', _err?.cause || ''));

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
      } catch { /* ignore header errors */ }

      onIncoming?.({ session, callerId, callerName, targetModel, relayExtension });

      session.on('ended',   () => { sessionRef.current = null; onEnded?.(); });
      session.on('failed',  () => { sessionRef.current = null; onEnded?.(); });
      session.on('accepted', () => onAnswered?.({ callerId, callerName, targetModel }));
    });

    ua.start();

    return () => {
      try { ua.stop(); } catch { /* ignore stop _err */ }
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
    try { session.terminate({ status_code: 486 }); } catch { /* ignore terminate _err */ }
    sessionRef.current = null;
  }, []);

  const hangup = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    try { session.terminate(); } catch { /* ignore terminate _err */ }
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

