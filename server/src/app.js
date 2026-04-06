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
const vultrRoutes = require('./routes/vultrRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const notesRoutes = require('./routes/notesRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sipRoutes = require('./routes/sipRoutes');

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

// Capacitor Android/iOS WebView always uses these origins — must be unconditionally allowed.
const CAPACITOR_ORIGINS = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile app, curl)
    if (!origin) return callback(null, true);
    
    // Exact allowlist for Firebase domains
    const FIREBASE_ORIGINS = [
      'https://nexus-hub.firebaseapp.com',
      'https://nexus-hub.web.app'
    ];
    
    // Always allow known patterns
    const isAllowed = allowedOrigins.includes(origin) || 
                      FIREBASE_ORIGINS.includes(origin) ||
                      CAPACITOR_ORIGINS.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS Blocked for origin: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

// Fix for Android native plugin sending non-standard "application/json; utf-8" (missing charset=)
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'application/json; utf-8') {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
});

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
app.use('/api/vultr', vultrRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sip', sipRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ message: 'Request blocked by CORS policy' });
  }
  logger.error('Unhandled Error:', err);
  if (!res.headersSent) {
    sendAlert(`Unhandled Server Error: ${err.message}\nStack: ${err.stack?.substring(0, 200)}...`);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = app;
