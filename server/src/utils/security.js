const crypto = require('crypto');

/**
 * Constant-time string comparison to prevent timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length === 0 || b.length === 0) {
    return false;
  }

  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    // Perform timingSafeEqual on identical buffers to ensure constant time even on length mismatch
    crypto.timingSafeEqual(aBuffer, aBuffer);
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Derive a per-device relay secret from the server master secret and the device's
 * installationId, using HMAC-SHA256. The master (DEVICE_SECRET) never leaves the
 * server; each device gets a unique, one-way-derived secret at binding time.
 * @param {string} installationId
 * @returns {string} hex digest, or '' if inputs are missing
 */
function deriveRelaySecret(installationId) {
  const master = process.env.DEVICE_SECRET;
  if (!master || !installationId) return '';
  return crypto.createHmac('sha256', master).update(String(installationId)).digest('hex');
}

module.exports = {
  secureCompare,
  deriveRelaySecret
};
