const { Server } = require('socket.io');

let io;

const jwt = require('jsonwebtoken');
const prisma = require('./db');

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
    },
    pingTimeout: 300000,
    pingInterval: 20000,
    connectTimeout: 45000
  });

  // Authentication Middleware for Socket.io
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Relay tokeny (automatizace/local-agent) jsou revokovatelné: token nese tv,
      // které musí sedět s aktuálním user.tokenVersion. Bump verze → token neplatný.
      if (decoded.type === 'relay') {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }, select: { tokenVersion: true }
        });
        if (!user || (decoded.tv || 0) !== (user.tokenVersion || 0)) {
          return next(new Error('Authentication error: Relay token revoked'));
        }
      }
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

    // Relay telefon (Android) se přihlásí do své vlastní místnosti podle installationId,
    // aby mohl přijímat WebRTC signaling (answer / ICE / hangup) cílený jen na něj.
    socket.on('join-relay', (data) => {
      const installationId = data && data.installationId;
      if (installationId) {
        socket.join(`relay:${installationId}`);
        console.log(`[Socket-Relay] Socket ${socket.id} (user ${userId}) joined room relay:${installationId}`);
      } else {
        console.warn(`[Socket-Relay] join-relay from ${userId} without installationId`);
      }
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
