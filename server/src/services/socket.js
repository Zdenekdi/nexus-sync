const { Server } = require('socket.io');

let io;

const jwt = require('jsonwebtoken');

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
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
      socket.join(`agency_${agencyId}`);
      console.log(`User ${userId} joined room: agency_${agencyId}`);
    }

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
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

module.exports = {
  init,
  getIO
};
