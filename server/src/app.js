const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

const logger = require('./services/logger');
const { sendAlert } = require('./services/alertService');

const app = express();

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/device', deviceRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err);
  
  // Alert admin of 500 errors
  if (!res.headersSent) {
    sendAlert(`Unhandled Server Error: ${err.message}\nStack: ${err.stack?.substring(0, 200)}...`);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = app;
