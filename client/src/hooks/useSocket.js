import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api').replace(/\/api$/, '');

export const useSocket = (token, onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand) => {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand });

  // Update refs when handlers change without re-triggering the socket effect
  useEffect(() => {
    handlersRef.current = { onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand };
  }, [onNewMessage, onMessageUpdated, onIncomingCall, onEmergencyAlert, onSipIncomingCall, onRelayCommand]);

  useEffect(() => {
    // If no token, don't connect or disconnect if already connected
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection if it doesn't exist or token changed
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {});

      socketRef.current.on('new_message', (data) => {
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
        console.log('Socket: Received relay_command', data);
        if (handlersRef.current.onRelayCommand) {
          handlersRef.current.onRelayCommand(data);
        }
      });

      // SIP příchozí hovor od relay zařízení
      socketRef.current.on('sip_incoming_call', (data) => {
        if (handlersRef.current.onSipIncomingCall) {
          handlersRef.current.onSipIncomingCall(data);
        }
      });

      socketRef.current.on('disconnect', () => {});

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }

    return () => {
      // Disconnect on unmount or token change to prevent leaks
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]); // Run when token changes
};
