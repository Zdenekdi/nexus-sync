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
export function useInCallService(handlers = {}) {
  const [callState,       setCallState]       = useState('idle');
  const [incomingCall,    setIncomingCall]     = useState(null);
  const [isDefault,       setIsDefault]        = useState(false);
  const [callDuration,    setCallDuration]     = useState(0);
  const timerRef = useRef(null);

  // WebRTC PeerConnection v prohlížeči (pro příjem zvuku z telefonu)
  const pcRef = useRef(null);

  // ── Kontrola výchozí telefonní aplikace ────────────────────────────────────

  useEffect(() => {
    if (!isInCallAvailable()) return;
    NexusInCall.isDefaultDialer().then(({ isDefault: d }) => setIsDefault(d));
  }, []);

  // ── Nastavení listenerů ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isInCallAvailable()) return;

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
        }
      })
    );

    // WebRTC signaling: offer přišel z telefonu → pošleme na server → server pošle do prohlížeče
    // Telefon sám vyšle event 'webrtcOffer' přes plugin → React ho zachytí
    // a přes socket.io pošle na server (zpracuje NexusContext)
    subs.push(
      NexusInCall.addListener('webrtcOffer', async (data) => {
        console.log('[InCall] WebRTC offer přijat, přeposílám přes socket...');
        // Přeposílá se přes window event → NexusContext ho odchytí
        window.dispatchEvent(new CustomEvent('nexus:webrtc-offer', { detail: data }));
      })
    );

    // ICE kandidáti z telefonu → server → prohlížeč
    subs.push(
      NexusInCall.addListener('iceCandidate', (data) => {
        window.dispatchEvent(new CustomEvent('nexus:ice-candidate-from-phone', { detail: data }));
      })
    );

    return () => {
      subs.forEach(s => s.then?.(l => l.remove()).catch(() => {}));
      clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebRTC: příjem zvuku v prohlížeči ─────────────────────────────────────

  useEffect(() => {
    // Poslouchá na offer přicházející ZE SERVERU (operátor v prohlížeči)
    const handleOfferFromServer = async (e) => {
      const { sdp, callerId } = e.detail;
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        pcRef.current = pc;

        // Zvukový výstup do prohlížeče
        pc.ontrack = (ev) => {
          if (ev.streams[0]) {
            const audio = new Audio();
            audio.srcObject = ev.streams[0];
            audio.autoplay = true;
          }
        };

        // ICE kandidáti z prohlížeče → server → telefon
        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            window.dispatchEvent(new CustomEvent('nexus:ice-candidate-from-browser', {
              detail: {
                sdpMid: ev.candidate.sdpMid,
                sdpMLineIndex: ev.candidate.sdpMLineIndex,
                candidate: ev.candidate.candidate,
              },
            }));
          }
        };

        // Přidej mikrofon prohlížeče (operátor mluví do telefonu)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        // Nastav remote description (offer z telefonu)
        await pc.setRemoteDescription({ type: 'offer', sdp });

        // Vytvoř answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Pošli answer zpět přes custom event → NexusContext → server → telefon
        window.dispatchEvent(new CustomEvent('nexus:webrtc-answer', {
          detail: { sdp: answer.sdp, callerId },
        }));

        console.log('[InCall] WebRTC answer vytvořen a odeslán');
      } catch (err) {
        console.error('[InCall] WebRTC answer selhalo:', err);
      }
    };

    // ICE kandidáti ze serveru (ze strany telefonu) → aplikuj na peer connection
    const handleIceFromServer = async (e) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(e.detail));
      } catch (err) {
        console.warn('[InCall] addIceCandidate failed:', err);
      }
    };

    window.addEventListener('nexus:webrtc-offer-for-browser', handleOfferFromServer);
    window.addEventListener('nexus:ice-candidate-for-browser', handleIceFromServer);

    return () => {
      window.removeEventListener('nexus:webrtc-offer-for-browser', handleOfferFromServer);
      window.removeEventListener('nexus:ice-candidate-for-browser', handleIceFromServer);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  // ── Akce ──────────────────────────────────────────────────────────────────

  const answer = useCallback(async () => {
    await NexusInCall.answer();
  }, []);

  const reject = useCallback(async () => {
    await NexusInCall.reject();
    setIncomingCall(null);
    setCallState('idle');
  }, []);

  const hangup = useCallback(async () => {
    await NexusInCall.hangup();
    clearInterval(timerRef.current);
    setIncomingCall(null);
    setCallState('idle');
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const setMuted = useCallback(async (muted) => {
    await NexusInCall.setMuted({ muted });
  }, []);

  const setSpeaker = useCallback(async (enabled) => {
    await NexusInCall.setSpeaker({ enabled });
  }, []);

  const requestDefaultDialer = useCallback(async () => {
    await NexusInCall.requestDefaultDialer();
    // Zkontroluj stav po chvíli
    setTimeout(async () => {
      const { isDefault: d } = await NexusInCall.isDefaultDialer();
      setIsDefault(d);
    }, 2000);
  }, []);

  return {
    incomingCall,
    callState,
    callDuration,
    isDefaultDialer: isDefault,
    answer,
    reject,
    hangup,
    setMuted,
    setSpeaker,
    requestDefaultDialer,
  };
}
