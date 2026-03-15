import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const useSocket = (onNewMessage, onMessageUpdated) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.io:', socketRef.current.id);
    });

    socketRef.current.on('new_message', (data) => {
      console.log('Received new_message:', data);
      if (onNewMessage) onNewMessage(data);
    });

    socketRef.current.on('message_updated', (data) => {
      console.log('Received message_updated:', data);
      if (onMessageUpdated) onMessageUpdated(data);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.io');
    });

  }, [onNewMessage, onMessageUpdated]);
};
