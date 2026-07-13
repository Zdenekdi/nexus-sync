const rateLimit = require('express-rate-limit');

/**
 * Dedicated limiter for WebRTC signaling (offer / answer / ICE / hangup).
 *
 * Signaling is bursty: a single call emits many ICE candidates within a few
 * seconds. This bucket is generous AND isolated from the device/write limiters,
 * so a chatty call can neither be throttled by, nor starve, the SMS-relay and
 * message endpoints that share the same client IP.
 */
const signalingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many signaling requests, please slow down.' }
});

module.exports = { signalingLimiter };
