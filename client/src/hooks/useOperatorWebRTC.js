import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNexus } from '../context/ContextHook';
import { API_BASE } from '../constants/config';

// Relay APK build (model's phone) must NOT act as an operator — it would receive
// the very call it is relaying (it sits in its own agency room). Gate it out.
const IS_RELAY_APP = typeof __APP_VARIANT__ !== 'undefined' && __APP_VARIANT__ === 'relay';

// Only operational call-handling roles answer relayed GSM calls: Operators and
// Senior Operators (aka Managers). Everyone else is excluded by omission —
// App Owner (incl. the `owner` alias / isAppOwner flag), Agency Admin, Model,
// and any unknown/not-yet-loaded role.
const CALL_ANSWER_ROLES = ['operator', 'senior_operator', 'manager', 'senior_manager'];

/**
 * useOperatorWebRTC - operatorska (prohlizec) strana WebRTC premosteni GSM hovoru.
 *
 * Relay telefon zachyti prichozi GSM hovor -> posle SDP offer na server ->
 * server ho preposle pres Socket.IO operatorum agentury (`call:incoming-gsm`).
 * Operator prijme -> vytvori answer -> posle na server -> server preposle telefonu.
 */
export function useOperatorWebRTC() {
  const { socket, activeRole, isAppOwner } = useNexus();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const pcRef = useRef(null);

  // Role gate (allowlist): only Operators / Senior Operators answer relayed calls.
  // isAppOwner is also excluded explicitly as defense-in-depth against bad data.
  const role = String(activeRole || '').toLowerCase();
  const canReceiveRelayCalls =
    !IS_RELAY_APP && isAppOwner !== true && CALL_ANSWER_ROLES.includes(role);

  const apiPost = useCallback((path, body) => {
    const token = localStorage.getItem('nexus_token');
    return axios.post(`${API_BASE}${path}`, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, []);

  useEffect(() => {
    if (!socket || !canReceiveRelayCalls) return;

    const onIncomingGsm = (data) => {
      console.log('[WebRTC Operator] Prichozi GSM hovor z relay:', data);
      setIncomingCall({ ...data, isRinging: true });
    };

    const onIceCandidate = async (data) => {
      if (data.from === 'phone' && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          console.warn('[WebRTC Operator] addIceCandidate selhalo:', err);
        }
      }
    };

    const onHangup = (data) => {
      console.log('[WebRTC Operator] Hovor ukoncen z druhe strany', data);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setIncomingCall(null);
      setActiveCall(null);
    };

    socket.on('call:incoming-gsm', onIncomingGsm);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:hangup', onHangup);

    return () => {
      socket.off('call:incoming-gsm', onIncomingGsm);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:hangup', onHangup);
    };
  }, [socket, canReceiveRelayCalls]);

  const answer = useCallback(async () => {
    if (!incomingCall || !incomingCall.sdp || !incomingCall.installationId) return;

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      pcRef.current = pc;

      pc.ontrack = (ev) => {
        if (ev.streams[0]) {
          const audio = new Audio();
          audio.srcObject = ev.streams[0];
          audio.autoplay = true;
        }
      };

      pc.onicecandidate = async (ev) => {
        if (ev.candidate) {
          try {
            await apiPost('/calls/webrtc/ice', {
              installationId: incomingCall.installationId,
              direction: 'browser-to-phone',
              sdpMid: ev.candidate.sdpMid,
              sdpMLineIndex: ev.candidate.sdpMLineIndex,
              candidate: ev.candidate.candidate,
            });
          } catch (err) {
            console.error('[WebRTC Operator] Nepodarilo se odeslat ICE', err);
          }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription({ type: 'offer', sdp: incomingCall.sdp });

      const localAnswer = await pc.createAnswer();
      await pc.setLocalDescription(localAnswer);

      await apiPost('/calls/webrtc/answer', {
        installationId: incomingCall.installationId,
        sdp: localAnswer.sdp,
        callerId: incomingCall.callerId,
      });

      console.log('[WebRTC Operator] Answer odeslan na server');

      setActiveCall({ ...incomingCall, status: 'active', startedAt: new Date() });
      setIncomingCall(null);
    } catch (err) {
      console.error('[WebRTC Operator] answer selhalo:', err);
    }
  }, [incomingCall, apiPost]);

  const reject = useCallback(async () => {
    if (!incomingCall?.installationId) return;
    try {
      await apiPost('/calls/webrtc/hangup', {
        installationId: incomingCall.installationId,
        initiator: 'browser'
      });
    } catch (err) {
      console.error('[WebRTC Operator] Reject selhalo:', err);
    }
    setIncomingCall(null);
    setActiveCall(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, [incomingCall, apiPost]);

  const hangup = useCallback(async () => {
    const callTarget = activeCall?.installationId || incomingCall?.installationId;
    if (!callTarget) return;

    try {
      await apiPost('/calls/webrtc/hangup', {
        installationId: callTarget,
        initiator: 'browser'
      });
    } catch (err) {
      console.error('[WebRTC Operator] Hangup selhalo:', err);
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIncomingCall(null);
    setActiveCall(null);
  }, [activeCall, incomingCall, apiPost]);

  return {
    incomingCall,
    activeCall,
    answer,
    reject,
    hangup,
  };
}
