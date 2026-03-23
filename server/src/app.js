const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const logger = require('./services/logger');
const { sendAlert } = require('./services/alertService');

// ── Startup: enforce required secrets ────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET is missing or too short (min 32 chars). Refusing to start.');
  process.exit(1);
}
if (!process.env.DEVICE_SECRET || process.env.DEVICE_SECRET.length < 16) {
  console.error('[FATAL] DEVICE_SECRET is missing or too short (min 16 chars). Refusing to start.');
  process.exit(1);
}

// Route imports
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const safetyRoutes = require('./routes/safetyRoutes');
const agencyRoutes = require('./routes/agencyRoutes');

const app = express();

app.set('trust proxy', 1);

// Static file serving for downloads with logging
app.use('/downloads', (req, res, next) => {
  console.log(`[Static] Request for: ${req.url}`);
  next();
}, express.static(path.join(__dirname, '..', 'public', 'downloads')));

// Rate limiting: 500 requests per 15 minutes
// (relay mode polls /api/device/status every 15 s → ~120 req/15 min per client;
//  multiple clients + other API calls could easily exceed a lower threshold)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later.' }
});

app.use(helmet());

// CORS: restrict to known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (native mobile app, curl, Postman in dev)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '64kb' }));

// Apply global limiter to all API routes
app.use('/api/', limiter);
// Stricter limiter on auth
app.use('/api/auth', authLimiter);

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
  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }
  logger.error('Unhandled Error:', err);
  if (!res.headersSent) {
    sendAlert(`Unhandled Server Error: ${err.message}\nStack: ${err.stack?.substring(0, 200)}...`);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = app;
