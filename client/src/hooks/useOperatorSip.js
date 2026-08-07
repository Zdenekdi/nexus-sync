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
  const domainRef = useRef('asterisk');
  // Popis toho, komu právě voláme — session ho sama nezná v podobě, kterou
  // chceme ukázat (jméno modelky, číslo klienta).
  const odchoziRef = useRef(null);

  // `handlers` chodí z volajícího jako objektový literál, takže má při každém
  // překreslení novou identitu. Kdyby visel v závislostech efektu, UA by se
  // při každém překreslení zastavil a založil znovu — a rozestavěný odchozí
  // hovor by se rozpadl dřív, než ho někdo zvedne.
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; });

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    sessionRef.current = null;
    odchoziRef.current = null;
    setCallSession(null);
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    handlersRef.current.onEnded?.();
  }, []);

  useEffect(() => {
    if (!config?.wsUrl || !config?.username || !config?.password) return;

    if (uaRef.current) {
      try { uaRef.current.stop(); } catch { /* ignore stop _err */ }
    }

    if (import.meta.env.PROD) JsSIP.debug.disable('JsSIP:*');

    const socket = new JsSIP.WebSocketInterface(config.wsUrl);
    const domain = (() => { try { return new URL(config.wsUrl).hostname; } catch { return 'asterisk'; } })();
    domainRef.current = domain;

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
      handlersRef.current.onStatusChange?.(s);
    };

    // Odpočet běží až od chvíle, kdy hovor někdo zvedne — ne od vytočení.
    const spustOdpocet = () => {
      setCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
    };

    ua.on('connecting', () => updateStatus('connecting'));
    ua.on('connected', () => updateStatus('connected'));
    ua.on('registered', () => updateStatus('registered'));
    ua.on('unregistered', () => updateStatus('idle'));
    ua.on('disconnected', () => updateStatus('disconnected'));
    ua.on('registrationFailed', () => updateStatus('failed'));

    ua.on('newRTCSession', ({ session, originator }) => {
      sessionRef.current = session;

      // ── Odchozí hovor ──────────────────────────────────────────────────
      // Vznikne hned po ua.call(). Do 'accepted' jen vyzvání — ale zavěsit
      // musí jít i během vyzvánění, proto se overlay ukáže rovnou.
      if (originator !== 'remote') {
        const info = {
          callerId:    odchoziRef.current?.cislo || session.remote_identity?.uri?.user || '',
          callerName:  odchoziRef.current?.jmenoKlienta || '',
          targetModel: odchoziRef.current?.jmenoModelky || null,
          odchozi:     true,
          vyzvani:     true,
          session,
        };
        setCallDuration(0);
        setActiveCall(info);

        session.on('accepted', () => {
          setActiveCall({ ...info, vyzvani: false });
          spustOdpocet();
          handlersRef.current.onAnswered?.(info);
        });
        session.on('ended',  () => cleanup());
        session.on('failed', () => cleanup());
        return;
      }

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
      handlersRef.current.onIncoming?.(info);

      session.on('accepted', () => {
        setActiveCall(info);
        setCallSession(null);
        spustOdpocet();
        handlersRef.current.onAnswered?.(info);
      });

      session.on('ended', () => cleanup());
      session.on('failed', () => cleanup());
    });

    ua.start();
    return () => { 
      try { ua.stop(); } catch { /* ignore stop _err */ } 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [config?.wsUrl, config?.username, config?.password, cleanup]);

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

  /**
   * Vytočí klienta pod číslem modelky.
   *
   * `cil` má tvar `<DID>*<číslo klienta>` — skládá ho `sestavOdchoziCil`.
   * Prefix vybírá, jaké číslo klient uvidí, ale rozhoduje o tom server:
   * dialplan má pravidlo jen pro DID, která jsou v databázi, takže vymyšlené
   * číslo hovor rovnou položí.
   *
   * @returns {{ ok: boolean, duvod?: string }}
   */
  const startCall = useCallback((cil, popis = {}) => {
    const ua = uaRef.current;
    if (!ua) return { ok: false, duvod: 'sipNepripojen' };
    if (!cil) return { ok: false, duvod: 'chybiCil' };
    if (sessionRef.current) return { ok: false, duvod: 'jinyHovor' };

    odchoziRef.current = popis;
    try {
      ua.call(`sip:${cil}@${domainRef.current}`, {
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      });
      return { ok: true };
    } catch (err) {
      odchoziRef.current = null;
      console.warn('[SIP] vytáčení selhalo:', err?.message);
      return { ok: false, duvod: 'vytaceniSelhalo' };
    }
  }, []);

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
    activeCall,   // { callerId, callerName, odchozi, vyzvani } | null
    callDuration, // sekundy — běží až od zvednutí
    isMuted,
    answer,
    reject,
    hangup,
    startCall,    // (cil, popis) => { ok, duvod? }
    toggleMute,
  };
}
