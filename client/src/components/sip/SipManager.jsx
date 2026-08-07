/**
 * SipManager.jsx — Orchestrates SIP calling for web operators.
 *
 * Responsibilities:
 *   1. Fetches SIP credentials from /api/sip/config
 *   2. Initializes JsSIP WebRTC via useOperatorSip hook
 *   3. Listens for socket.io sip_incoming_call events (supplementary metadata)
 *   4. Renders IncomingOperatorCall / ActiveOperatorCall overlays
 *   5. Shows OperatorSipStatus badge in parent via render-prop
 *
 * Usage in GlobalModalContainer:
 *   <SipManager />
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNexus } from '../../context/ContextHook';
import { useOperatorSip } from '../../hooks/useOperatorSip';
import { IncomingOperatorCall, ActiveOperatorCall } from './OperatorCallScreen';

const SIP_WS_URL = import.meta.env.VITE_SIP_WS_URL || 'wss://nexus-api.myvnc.com:8089/ws';

export default function SipManager() {
  const { token, API_BASE, activeRole, isLoggedIn, showToast, lang, registerSipDialer } = useNexus();
  const [sipCredentials, setSipCredentials] = useState(null);
  const fetchedRef = useRef(false);

  // Only operators and senior operators handle SIP calls on the web
  const isSipRole = activeRole === 'operator' || activeRole === 'senior_operator';

  // Fetch SIP credentials once after login
  useEffect(() => {
    if (!isLoggedIn || !token || !isSipRole || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/sip/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.ok && res.data.sipConfig) {
          setSipCredentials(res.data.sipConfig);
        }
      } catch (_err) {
        console.warn('[SipManager] Could not fetch SIP config:', _err.message);
      }
    })();
  }, [isLoggedIn, token, isSipRole, API_BASE]);

  // Reset on logout
  useEffect(() => {
    if (!isLoggedIn && sipCredentials !== null) {
      Promise.resolve().then(() => setSipCredentials(null));
      fetchedRef.current = false;
    }
  }, [isLoggedIn, sipCredentials]);

  // Initialize WebRTC SIP via JsSIP
  const sipConfig = sipCredentials ? {
    wsUrl: SIP_WS_URL,
    username: sipCredentials.username,
    password: sipCredentials.password,
  } : null;

  const {
    sipStatus: _sipStatus,
    callSession,
    activeCall,
    callDuration,
    isMuted,
    answer,
    reject,
    hangup,
    startCall,
    toggleMute,
  } = useOperatorSip(sipConfig, {
    onIncoming: (info) => {
      showToast(
        lang === 'cz'
          ? `📞 Příchozí hovor: ${info.callerName || info.callerId}`
          : `📞 Incoming call: ${info.callerName || info.callerId}`,
        'info'
      );
    },
    onEnded: () => {
      showToast(
        lang === 'cz' ? 'Hovor ukončen.' : 'Call ended.',
        'info'
      );
    },
  });

  // SIP spojení žije tady, ale zavolat potřebuje schránka. Kontext si proto
  // nechá zaregistrovat vytáčecí funkci — přesouvat celé UA do kontextu kvůli
  // jednomu tlačítku by znamenalo sáhnout do funkční telefonie.
  useEffect(() => {
    if (!registerSipDialer) return undefined;
    registerSipDialer(isSipRole && isLoggedIn ? startCall : null);
    return () => registerSipDialer(null);
  }, [registerSipDialer, startCall, isSipRole, isLoggedIn]);

  // Don't render anything for non-SIP roles or when not logged in
  if (!isSipRole || !isLoggedIn) return null;

  return (
    <>
      {/* Incoming call overlay */}
      {callSession && (
        <IncomingOperatorCall
          callerId={callSession.callerId}
          callerName={callSession.callerName}
          targetModel={callSession.targetModel}
          onAnswer={answer}
          onReject={reject}
        />
      )}

      {/* Active call overlay */}
      {activeCall && (
        <ActiveOperatorCall
          callerId={activeCall.callerId}
          callerName={activeCall.callerName}
          targetModel={activeCall.targetModel}
          duration={callDuration}
          isMuted={isMuted}
          onHangup={hangup}
          onToggleMute={toggleMute}
        />
      )}
    </>
  );
}
