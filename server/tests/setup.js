// Set required env vars for app.js startup checks
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
process.env.DEVICE_SECRET = 'test-device-secret-16chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-32-chars-long';
process.env.NODE_ENV = 'test';

// Suppress console output during tests
const noop = () => {};
console.log = noop;
console.warn = noop;
console.info = noop;
// Keep console.error for debugging failures if needed
