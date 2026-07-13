import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api').replace(/\/api$/, '');

export const useSocket = (token, onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand, onRelayEvent, onTrackerLocation) => {
  const socketRef = useRef(null);
  // Reactive socket instance so consumers (nexus.socket) re-render once it's ready
  const [socket, setSocket] = useState(null);
  const handlersRef = useRef({ onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand, onRelayEvent, onTrackerLocation });

  // Update refs when handlers change without re-triggering the socket effect
  useEffect(() => {
    handlersRef.current = { onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand, onRelayEvent, onTrackerLocation };
  }, [onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand, onRelayEvent, onTrackerLocation]);

  useEffect(() => {
    // If no token, don't connect or disconnect if already connected
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSocket(null);
      }
      return;
    }

    // Initialize socket connection if it doesn't exist or token changed
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 30000,
        upgrade: true,
        autoConnect: true,
      });

      // Global reference for legacy components/bridge
      window._nexusSocket = socketRef.current;
      // Expose the socket reactively (nexus.socket) for WebRTC relay + other consumers
      setSocket(socketRef.current);

      // Pouze ve vývoji — jinak by se do konzole dumpovaly VŠECHNY příchozí payloady
      // (obsahy zpráv, data hovorů, polohy trackerů = PII) čitelné komukoli s devtools.
      if (import.meta.env.DEV) {
        socketRef.current.onAny((event, ...args) => {
          console.log(`[Socket-DEBUG] Received event: ${event}`, args);
        });
      }

      socketRef.current.on('connect', () => {
        if (import.meta.env.DEV) console.log('[Socket-DEBUG] Connected with ID:', socketRef.current.id);
      });

      socketRef.current.on('new_message', (data) => {
        if (import.meta.env.DEV) console.log('[Socket-DEBUG] new_message received:', data);
        if (handlersRef.current.onNewMessage) {
          handlersRef.current.onNewMessage(data);
        }
      });

      socketRef.current.on('message_updated', (data) => {
        if (handlersRef.current.onMessageUpdated) {
          handlersRef.current.onMessageUpdated(data);
        }
      });

      socketRef.current.on('incoming_call', (data) => {
        if (handlersRef.current.onIncomingCall) {
          handlersRef.current.onIncomingCall(data);
        }
      });

      socketRef.current.on('emergency_alert', (data) => {
        if (handlersRef.current.onEmergencyAlert) {
          handlersRef.current.onEmergencyAlert(data);
        }
      });

      socketRef.current.on('relay_command', (data) => {
        if (import.meta.env.DEV) console.log('Socket: Received relay_command', data);
        if (handlersRef.current.onRelayCommand) {
          handlersRef.current.onRelayCommand(data);
        }
      });

      socketRef.current.on('relay_event', (data) => {
        if (import.meta.env.DEV) console.log('Socket: Received relay_event', data);
        if (handlersRef.current.onRelayEvent) {
          handlersRef.current.onRelayEvent(data);
        }
      });

      socketRef.current.on('tracker_location_update', (data) => {
        if (handlersRef.current.onTrackerLocation) {
          handlersRef.current.onTrackerLocation(data);
        }
      });

      // SIP příchozí hovor od relay zařízení
      socketRef.current.on('sip_incoming_call', (data) => {
        if (handlersRef.current.onSipIncomingCall) {
          handlersRef.current.onSipIncomingCall(data);
        }
      });

      socketRef.current.on('disconnect', () => {});

      socketRef.current.on('connect_error', (_err) => {
        console.error('Socket connection _err:', _err);
      });
    }

    return () => {
      // Disconnect on unmount or token change to prevent leaks
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [token]); // Run when token changes

  return socket;
};
