const { Server } = require('socket.io');

let io;

const jwt = require('jsonwebtoken');

const init = (server) => {
  // Build allowed origins matching the Express CORS configuration
  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const FIREBASE_ORIGINS = [
    'https://nexus-hub.firebaseapp.com',
    'https://nexus-hub.web.app'
  ];

  const CAPACITOR_ORIGINS = [
    'https://localhost',
    'capacitor://localhost',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  const allowedOrigins = [...envOrigins, ...FIREBASE_ORIGINS, ...CAPACITOR_ORIGINS];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Socket.io CORS: Origin ${origin} not allowed`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { agencyId, userId } = socket.user;
    
    // Join a room for the specific agency
    if (agencyId) {
      console.log(`[Socket-DEBUG] User ${userId} joining room agency_${agencyId}`);
      socket.join(`agency_${agencyId}`);
    } else {
      console.warn(`[Socket-DEBUG] User ${userId} connected but has NO agencyId in token!`);
    }

    socket.on('relay_event', (data) => {
      console.log(`[Socket-Relay] Event from ${userId} for agency_${agencyId}:`, data);
      // Přeposlat všem v místnosti (operátorům)
      socket.to(`agency_${agencyId}`).emit('relay_event', data);
    });

    socket.on('disconnect', () => {
      console.log('[Socket-DEBUG] User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const getRoomSize = (roomName) => {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get(roomName);
  return room ? room.size : 0;
};

module.exports = {
  init,
  getIO,
  getRoomSize
};
