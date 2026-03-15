import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const useSocket = (onNewMessage, onMessageUpdated) => {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onNewMessage, onMessageUpdated });

  // Update refs when handlers change without re-triggering the socket effect
  useEffect(() => {
    handlersRef.current = { onNewMessage, onMessageUpdated };
  }, [onNewMessage, onMessageUpdated]);

  useEffect(() => {
    // Initialize socket connection if it doesn't exist
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
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

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.io:', reason);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }

    return () => {
      // We keep the socket alive during the session, but could disconnect on unmount 
      // if this hook is only used once in the App. 
      // Given the App structure, disconnecting here is safe if used in App.jsx.
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Run only once on mount
};

