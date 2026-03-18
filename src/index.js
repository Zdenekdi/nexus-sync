require('dotenv').config();
const app = require('./app');

const logger = require('./services/logger');
const http = require('http');
const socketService = require('./services/socket');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

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
