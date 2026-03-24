try {
  require('dotenv').config();
} catch (e) {
  console.warn('[Bootstrap] DOTENV Load failed - assuming ENV variables are set externally:', e.message);
}

const app = require('./app');

const logger = require('./services/logger');
const http = require('http');
const socketService = require('./services/socket');
const safetyService = require('./services/safetyService');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// Start Safety Worker
safetyService.startEscalationWorker();

// Handle Unhandled Rejections and Exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Give time for logs to write
  setTimeout(() => process.exit(1), 500);
});

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Graceful Shutdown
const shutdown = () => {
  logger.info('Gracefully shutting down...');
  server.close(() => {
    logger.info('HTTP server closed.');
    // If you had a db client pool, close it here
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
