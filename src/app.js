const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const logger = require('./services/logger');
const { sendAlert } = require('./services/alertService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const safetyRoutes = require('./routes/safetyRoutes');
const agencyRoutes = require('./routes/agencyRoutes');

const app = express();

// Enable trust proxy for express-rate-limit behind Vultr/Nginx proxy
app.set('trust proxy', 1);

// Static file serving for downloads with logging
app.use('/downloads', (req, res, next) => {
  console.log(`[Static] Request for: ${req.url}`);
  next();
}, express.static(path.join(__dirname, '..', 'public', 'downloads')));

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Apply limiter to auth and device routes
app.use('/api/auth', limiter);
app.use('/api/device', limiter);

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
app.use('/api/safety', safetyRoutes);
app.use('/api/agency', agencyRoutes);

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
