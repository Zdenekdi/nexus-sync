/**
 * NexusSms.js
 * Capacitor plugin wrapper pro SMS interceptor (nexusRelay varianta).
 * V nexusFull variantě se plugin ignoruje — SMS přicházejí přes Socket.IO ze serveru.
 */
import { registerPlugin } from '@capacitor/core';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Registrace Capacitor pluginu (funguje jen v Android nexusRelay APK)
const NexusRelayPlugin = registerPlugin('NexusRelay', {
  web: {
    // Webový stub — vrátí bezpečné výchozí hodnoty
    isDefaultSmsApp:     async () => ({ isDefault: false }),
    requestDefaultSmsApp: async () => ({}),
    isDefaultDialer:     async () => ({ isDefault: false }),
    requestDefaultDialer: async () => ({}),
  },
});

// ── Detekce varianty APK ────────────────────────────────────────────────────
export const APP_VARIANT = window.__APP_VARIANT__ || 'full'; // 'relay' | 'full'
export const isRelayVariant = APP_VARIANT === 'relay';

// ── useSmsRelay hook ────────────────────────────────────────────────────────
/**
 * Hook pro SMS interceptor.
 *
 * V nexusRelay APK:
 *   - Naslouchá příchozím SMS přes NexusSmsReceiver → NexusRelayPlugin event
 *   - Může zjistit/nastavit výchozí SMS aplikaci
 *
 * V nexusFull APK / prohlížeči:
 *   - Naslouchá Socket.IO události 'sms:incoming' ze serveru
 *   - Zobrazuje přeposlané SMS operátorce
 *
 * @param {Object} options
 * @param {Function} options.onIncoming - callback (sms: {from, body, timestamp})
 * @param {Object} options.socket - Socket.IO instance (pro nexusFull)
 */
export function useSmsRelay({ onIncoming, socket } = {}) {
  const [isDefaultSmsApp, setIsDefaultSmsApp] = useState(false);
  const [incomingSms, setIncomingSms]         = useState(null);
  const onIncomingRef = useRef(onIncoming);
  useEffect(() => { onIncomingRef.current = onIncoming; }, [onIncoming]);

  // ── Zkontroluj stav výchozí SMS aplikace ──────────────────────────────────
  useEffect(() => {
    NexusRelayPlugin.isDefaultSmsApp()
      .then(r => setIsDefaultSmsApp(!!r?.isDefault))
      .catch(() => setIsDefaultSmsApp(false));
  }, []);

  // ── nexusRelay varianta: nativní SMS event ────────────────────────────────
  useEffect(() => {
    if (!isRelayVariant) return;

    let listener;
    NexusRelayPlugin.addListener('onSmsReceived', (data) => {
      const sms = {
        from:      data.sender  || data.from || 'Neznámé číslo',
        body:      data.body    || data.message || '',
        timestamp: data.timestamp || Date.now(),
      };
      setIncomingSms(sms);
      onIncomingRef.current?.(sms);

      // Přepošleme to na server, aby to viděli operátoři
      axios.post('/api/sms/incoming', sms).catch(console.error);
    }).then(l => { listener = l; });

    return () => { listener?.remove?.(); };
  }, []);

  // ── nexusFull varianta: přeposlané SMS ze serveru přes Socket.IO ──────────
  useEffect(() => {
    if (isRelayVariant || !socket) return;

    const handler = (data) => {
      const sms = {
        from:      data.from || data.sender || 'Relay',
        body:      data.body || data.message || '',
        timestamp: data.timestamp || Date.now(),
        relayId:   data.installationId,
      };
      setIncomingSms(sms);
      onIncomingRef.current?.(sms);
    };

    socket.on('sms:incoming', handler);
    return () => { socket.off('sms:incoming', handler); };
  }, [socket]);

  const sendSms = async (to, text) => {
    if (isRelayVariant) {
      if (NexusRelayPlugin.sendSms) {
        return NexusRelayPlugin.sendSms({ to, text });
      }
      return Promise.reject(new Error('Plugin sendSms method missing'));
    } else {
      return axios.post('/api/sms/send', { to, text });
    }
  };

  return {
    isDefaultSmsApp,
    incomingSms,
    clearIncomingSms:     () => setIncomingSms(null),
    sendSms,
    requestDefaultSmsApp: () => NexusRelayPlugin.requestDefaultSmsApp().then(() =>
      NexusRelayPlugin.isDefaultSmsApp().then(r => setIsDefaultSmsApp(!!r?.isDefault))
    ),
  };
}
