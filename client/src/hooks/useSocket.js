import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://nexus-api.myvnc.com';

export const useSocket = (token, onNewMessage, onMessageUpdated, onIncomingCall) => {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onNewMessage, onMessageUpdated, onIncomingCall });

  // Update refs when handlers change without re-triggering the socket effect
  useEffect(() => {
    handlersRef.current = { onNewMessage, onMessageUpdated, onIncomingCall };
  }, [onNewMessage, onMessageUpdated, onIncomingCall]);

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

      socketRef.current.on('connect', () => {
        console.log('Connected to Socket.io:', socketRef.current.id);
      });

      socketRef.current.on('new_message', (data) => {
        console.log('Received new_message:', data);
        if (handlersRef.current.onNewMessage) {
          handlersRef.current.onNewMessage(data);
        }
      });

      socketRef.current.on('message_updated', (data) => {
        console.log('Received message_updated:', data);
        if (handlersRef.current.onMessageUpdated) {
          handlersRef.current.onMessageUpdated(data);
        }
      });

      socketRef.current.on('incoming_call', (data) => {
        console.log('Received incoming_call:', data);
        if (handlersRef.current.onIncomingCall) {
          handlersRef.current.onIncomingCall(data);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.io:', reason);
      });

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
