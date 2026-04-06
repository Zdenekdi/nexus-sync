try {
  require('dotenv').config();
} catch (e) {
  console.warn('[Bootstrap] DOTENV Load failed - assuming ENV variables are set externally:', e.message);
}

const logger = require('./services/logger');

// Sentry must be initialized before anything else
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.2,
    beforeSend(event) {
      // Don't send 4xx client errors
      if (event.contexts?.response?.status_code < 500) return null;
      return event;
    }
  });
  logger.info('Sentry initialized');
} else {
  logger.warn('SENTRY_DSN not configured — error tracking disabled');
}

const app = require('./app');

const http = require('http');
const socketService = require('./services/socket');
const safetyService = require('./services/safetyService');
const cronService = require('./services/cronService');

const prisma = require('./services/db');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// Start Safety Worker
safetyService.startEscalationWorker();

// Start Cron Jobs
cronService.start();

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
const shutdown = async () => {
  logger.info('Gracefully shutting down...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
    } catch (e) {
      logger.error('Prisma disconnect error:', e);
    }
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
