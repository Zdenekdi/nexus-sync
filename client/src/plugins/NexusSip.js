/**
 * NexusSip.js — JavaScript wrapper pro NexusSipPlugin (Capacitor)
 *
 * ── Rychlé použití ────────────────────────────────────────────────────────────
 *
 *   import { NexusSip, useSipCall } from './plugins/NexusSip';
 *
 *   // Inicializace (server + port — odpovídá NexusSipPlugin.java)
 *   await NexusSip.initialize({
 *     server:   '78.141.202.139',   // IP nebo hostname Asterisku
 *     username: 'diana',            // SIP extension
 *     password: 'sip-heslo',
 *     port:     5060                // výchozí UDP SIP port
 *   });
 *
 *   // Příchozí hovor
 *   NexusSip.addListener('incomingCall', (e) => {
 *     console.log('Volá:', e.callerId); // e.callerId === e.caller (obě fungují)
 *   });
 *
 *   await NexusSip.answer();   // přijmout
 *   await NexusSip.reject();   // odmítnout (SIP 486)
 *   await NexusSip.hangup();   // zavěsit  (SIP BYE)
 *   await NexusSip.mute({ muted: true });
 *   await NexusSip.setSpeaker({ enabled: true });
 *   const { calls } = await NexusSip.getCallHistory();
 *
 * ── React hook ────────────────────────────────────────────────────────────────
 *
 *   const { sipState, incomingCall, answer, reject, hangup, toggleMute } =
 *     useSipCall({ server, username, password, port }, {
 *       onIncoming: (e) => showIncomingScreen(e),
 *       onAnswered: ()  => showActiveCallScreen(),
 *       onEnded:    ()  => hideCallScreen(),
 *     });
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Plugin registration ───────────────────────────────────────────────────────

export const NexusSip = registerPlugin('NexusSip', {
  web: () => import('./NexusSipWeb').then(m => new m.NexusSipWeb()),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export const isSipAvailable = () => Capacitor.isNativePlatform();

export function formatCallDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── useSipCall hook ───────────────────────────────────────────────────────────

/**
 * useSipCall(config, handlers)
 *
 * config = { server, username, password, port? }
 *   — odpovídá parametrům NexusSipPlugin.initialize()
 *
 * handlers = { onIncoming, onAnswered, onEnded, onRegistered }
 */
export function useSipCall(config, handlers = {}) {
  const [sipState,         setSipState]         = useState('idle');
  const [incomingCall,     setIncomingCall]     = useState(null);
  const [callDuration,     setCallDuration]     = useState(0);
  const [isMuted,          setIsMuted]          = useState(false);
  const [isSpeaker,        setIsSpeaker]        = useState(false);
  const [permissionWarning, setPermissionWarning] = useState(null); // { permission, message }
  const timerRef = useRef(null);

  // ── Initialize + event listeners ──────────────────────────────────────────

  useEffect(() => {
    if (!isSipAvailable() || !config?.server || !config?.username) return;

    setSipState('registering');

    NexusSip.initialize({
      server:   config.server,
      username: config.username,
      password: config.password || '',
      port:     config.port     || 5060,
    }).then(() => {
      setSipState('registered');
    }).catch(err => {
      console.warn('[SIP] initialize error:', err);
      setSipState('idle');
    });

    const subs = [
      NexusSip.addListener('registered', () => {
        setSipState('registered');
        handlers.onRegistered?.();
      }),

      // Java emituje: { caller, callerName, callId }
      // Pro kompatibilitu s event.callerId přidáváme alias
      NexusSip.addListener('incomingCall', data => {
        const normalized = {
          ...data,
          callerId:   data.callerId   || data.caller,     // alias
          callerName: data.callerName || data.caller,
          caller:     data.caller     || data.callerId,
        };
        setIncomingCall(normalized);
        setSipState('ringing');
        handlers.onIncoming?.(normalized);
      }),

      NexusSip.addListener('callAnswered', data => {
        setSipState('in_call');
        setCallDuration(0);
        timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
        handlers.onAnswered?.(data);
      }),

      NexusSip.addListener('callEnded', data => {
        clearInterval(timerRef.current);
        setIncomingCall(null);
        setSipState('registered');
        setCallDuration(0);
        setIsMuted(false);
        setIsSpeaker(false);
        handlers.onEnded?.(data);
      }),

      NexusSip.addListener('muteChanged', data => {
        setIsMuted(data.muted ?? false);
      }),

      // Android 14+ — USE_FULL_SCREEN_INTENT vyžaduje explicitní grant
      NexusSip.addListener('permissionRequired', data => {
        setPermissionWarning({ permission: data.permission, message: data.message });
        console.warn('[SIP] Chybí oprávnění:', data.permission, data.message);
      }),
    ];

    return () => {
      clearInterval(timerRef.current);
      subs.forEach(s => s?.remove?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.server, config?.username]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const answer = useCallback(async () => {
    const result = await NexusSip.answer();
    return result;
  }, []);

  const reject = useCallback(async () => {
    setIncomingCall(null);
    setSipState('registered');
    await NexusSip.reject();
  }, []);

  const hangup = useCallback(async () => {
    clearInterval(timerRef.current);
    setIncomingCall(null);
    setSipState('registered');
    setCallDuration(0);
    await NexusSip.hangup();
  }, []);

  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    setIsMuted(next);
    await NexusSip.mute({ muted: next });
  }, [isMuted]);

  const toggleSpeaker = useCallback(async () => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    await NexusSip.setSpeaker({ enabled: next });
  }, [isSpeaker]);

  const getHistory = useCallback(() => NexusSip.getCallHistory(), []);

  return {
    sipState,         // 'idle' | 'registering' | 'registered' | 'ringing' | 'in_call'
    incomingCall,     // { caller, callerId, callerName, callId } | null
    callDuration,     // sekundy (pro timer v UI)
    isMuted,
    isSpeaker,
    permissionWarning, // { permission, message } | null — Android 14+ full screen intent
    answer,
    reject,
    hangup,
    toggleMute,
    toggleSpeaker,
    getHistory,
  };
}
