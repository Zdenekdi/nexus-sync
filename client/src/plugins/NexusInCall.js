/**
 * NexusInCall.js — JavaScript wrapper pro NexusInCallPlugin (Capacitor)
 *
 * Umožňuje Nexus aplikaci přijímat reálné GSM hovory bez externího SIP Trunk providera.
 * Telefon s SIM modelky musí být nastaven jako výchozí telefonní aplikace.
 *
 * ── Použití ────────────────────────────────────────────────────────────────────
 *
 *   import { NexusInCall, useInCallService } from './plugins/NexusInCall';
 *
 *   // Zkontroluj, zda je Nexus výchozí telefonní aplikace
 *   const { isDefault } = await NexusInCall.isDefaultDialer();
 *
 *   // Požádej uživatele o nastavení
 *   await NexusInCall.requestDefaultDialer();
 *
 *   // React hook (doporučeno pro RelayMode)
 *   const { incomingCall, answer, reject, hangup, callState } = useInCallService({
 *     onIncoming: (call) => console.log('Volá:', call.callerId),
 *     onAnswered:  ()    => console.log('Hovor aktivní'),
 *     onEnded:     ()    => console.log('Hovor ukončen'),
 *   });
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Plugin registration ────────────────────────────────────────────────────────

export const NexusInCall = registerPlugin('NexusInCall', {
  // Web fallback — na desktopu plugin nefunguje (pouze Android)
  web: () => ({
    isDefaultDialer:    async () => ({ isDefault: false }),
    requestDefaultDialer: async () => {},
    answer:             async () => {},
    reject:             async () => {},
    hangup:             async () => {},
    setMuted:           async () => {},
    setSpeaker:         async () => {},
    applyRemoteAnswer:  async () => {},
    addIceCandidate:    async () => {},
    addListener:        async () => ({ remove: () => {} }),
  }),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/** True pouze pokud běžíme jako nativní Android aplikace */
export const isInCallAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// ── useInCallService hook ──────────────────────────────────────────────────────

/**
 * useInCallService(handlers)
 *
 * handlers = { onIncoming, onAnswered, onEnded }
 *
 * Vrací:
 *   incomingCall   — { callerId, callId } nebo null
 *   callState      — 'idle' | 'ringing' | 'active' | 'holding' | 'ended'
 *   isDefaultDialer — boolean
 *   answer()       — přijme hovor
 *   reject()       — odmítne hovor
 *   hangup()       — zavěsí
 *   setMuted(bool) — ztlumí mikrofon
 *   setSpeaker(bool) — přepne na reproduktor
 *   requestDefaultDialer() — otevře dialog pro nastavení výchozí aplikace
 */
export function useInCallService(config, handlers = {}) {
  const [callState,       setCallState]       = useState('idle');
  const [incomingCall,    setIncomingCall]     = useState(null);
  const [isDefault,       setIsDefault]        = useState(false);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [callDuration,    setCallDuration]     = useState(0);
  const timerRef = useRef(null);

  // WebRTC PeerConnection v prohlížeči (pro příjem zvuku z telefonu)
  const pcRef = useRef(null);

  // ── Kontrola výchozí telefonní aplikace ────────────────────────────────────

  useEffect(() => {
    if (!isInCallAvailable()) return;
    NexusInCall.isDefaultDialer().then(({ isDefault: d, featureEnabled }) => {
      const enabled = featureEnabled !== false;
      setIsFeatureEnabled(enabled);
      setIsDefault(enabled && d);
    }).catch(() => {
      setIsFeatureEnabled(false);
      setIsDefault(false);
    });
  }, []);

  // ── Nastavení listenerů ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isInCallAvailable() || !isFeatureEnabled) return;

    const subs = [];

    // Příchozí GSM hovor
    subs.push(
      NexusInCall.addListener('incomingGsmCall', (data) => {
        console.log('[InCall] Příchozí hovor:', data.callerId);
        setIncomingCall(data);
        setCallState('ringing');
        handlers.onIncoming?.(data);
      })
    );

    // Změna stavu hovoru
    subs.push(
      NexusInCall.addListener('callStateChanged', (data) => {
        setCallState(data.state);
        if (data.state === 'active') {
          setCallDuration(0);
          timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
          handlers.onAnswered?.();
        }
        if (data.state === 'ended') {
          clearInterval(timerRef.current);
          setIncomingCall(null);
          setCallState('idle');
          handlers.onEnded?.();
          
          // Notify server so browser can hangup
          if (config?.apiUrl && config?.installationId) {
            try {
              fetch(`${config.apiUrl}/webrtc/hangup`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-installation-id': config.installationId,
                  'x-device-secret': localStorage.getItem('nexus_relay_device_secret') || config?.secret || '',
                },
                body: JSON.stringify({ initiator: 'phone' })
              }).catch(_err => console.error(_err));
            } catch (_err) {
              console.error('[InCall] hangup failed', _err);
            }
          }
        }
      })
    );

    // WebRTC signaling: offer přišel z telefonu → pošleme na server → server pošle do prohlížeče
    subs.push(
      NexusInCall.addListener('webrtcOffer', async (data) => {
        console.log('[InCall] WebRTC offer přijat, odesílám na server...');
        if (config?.apiUrl && config?.installationId) {
          try {
            await fetch(`${config.apiUrl}/webrtc/offer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-installation-id': config.installationId,
                'x-device-secret': localStorage.getItem('nexus_relay_device_secret') || config?.secret || '',
              },
              body: JSON.stringify(data)
            });
          } catch (err) {
            console.error('[InCall] webrtcOffer API chyba:', err);
          }
        }
      })
    );

    // ICE kandidáti z telefonu → server
    subs.push(
      NexusInCall.addListener('iceCandidate', async (data) => {
        if (config?.apiUrl && config?.installationId) {
          try {
            await fetch(`${config.apiUrl}/webrtc/ice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-installation-id': config.installationId,
                'x-device-secret': localStorage.getItem('nexus_relay_device_secret') || config?.secret || '',
              },
              body: JSON.stringify({ ...data, direction: 'phone-to-browser' })
            });
          } catch (err) {
            console.error('[InCall] iceCandidate API chyba:', err);
          }
        }
      })
    );

    return () => {
      subs.forEach(s => s.then?.(l => l.remove()).catch(() => {}));
      clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFeatureEnabled]);

  // ── WebRTC: Poslech Socket.io pro odpověď ze serveru ──────────────────────
  useEffect(() => {
    if (!config?.socket) return;
    const socket = config.socket;

    const onAnswer = (data) => {
      console.log('[InCall] WebRTC answer ze serveru, aplikuji...', data);
      NexusInCall.applyRemoteAnswer({ sdp: data.sdp });
    };

    const onIce = (data) => {
      if (data.from === 'browser') {
        NexusInCall.addIceCandidate({
          sdpMid: data.sdpMid,
          sdpMLineIndex: data.sdpMLineIndex,
          candidate: data.candidate
        });
      }
    };

    const onHangup = () => {
      NexusInCall.hangup();
      setIncomingCall(null);
      setCallState('idle');
    };

    socket.on('call:webrtc-answer', onAnswer);
    socket.on('call:ice-candidate', onIce);
    socket.on('call:hangup', onHangup);

    return () => {
      socket.off('call:webrtc-answer', onAnswer);
      socket.off('call:ice-candidate', onIce);
      socket.off('call:hangup', onHangup);
    };
  }, [config?.socket]);

  // ── Relay telefon se přihlásí do své socket místnosti (relay:<installationId>) ──
  // Bez toho by mu server nemohl cíleně poslat answer / ICE / hangup.
  useEffect(() => {
    const socket = config?.socket;
    const installationId = config?.installationId;
    if (!socket || !installationId) return;

    const joinRelayRoom = () => {
      socket.emit('join-relay', { installationId });
    };

    if (socket.connected) joinRelayRoom();
    socket.on('connect', joinRelayRoom);

    return () => {
      socket.off('connect', joinRelayRoom);
    };
  }, [config?.socket, config?.installationId]);

  // ── Akce ──────────────────────────────────────────────────────────────────

  const answer = useCallback(async () => {
    if (!isFeatureEnabled) return;
    await NexusInCall.answer();
  }, [isFeatureEnabled]);

  const reject = useCallback(async () => {
    if (!isFeatureEnabled) return;
    await NexusInCall.reject();
    setIncomingCall(null);
    setCallState('idle');
  }, [isFeatureEnabled]);

  const hangup = useCallback(async () => {
    if (!isFeatureEnabled) return;
    await NexusInCall.hangup();
    clearInterval(timerRef.current);
    setIncomingCall(null);
    setCallState('idle');
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, [isFeatureEnabled]);

  const setMuted = useCallback(async (muted) => {
    if (!isFeatureEnabled) return;
    await NexusInCall.setMuted({ muted });
  }, [isFeatureEnabled]);

  const setSpeaker = useCallback(async (enabled) => {
    if (!isFeatureEnabled) return;
    await NexusInCall.setSpeaker({ enabled });
  }, [isFeatureEnabled]);

  const requestDefaultDialer = useCallback(async () => {
    if (!isFeatureEnabled) return;
    await NexusInCall.requestDefaultDialer();
    // Zkontroluj stav po chvíli
    setTimeout(async () => {
      const { isDefault: d, featureEnabled } = await NexusInCall.isDefaultDialer();
      const enabled = featureEnabled !== false;
      setIsFeatureEnabled(enabled);
      setIsDefault(enabled && d);
    }, 2000);
  }, [isFeatureEnabled]);

  return {
    incomingCall,
    callState,
    callDuration,
    isDefaultDialer: isDefault,
    isFeatureEnabled,
    answer,
    reject,
    hangup,
    setMuted,
    setSpeaker,
    requestDefaultDialer,
  };
}
