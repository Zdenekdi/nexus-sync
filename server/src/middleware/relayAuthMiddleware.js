const prisma = require('../services/db');
const logger = require('../services/logger');
const { secureCompare, deriveRelaySecret } = require('../utils/security');

/**
 * Middleware to authenticate requests from the Nexus Relay Android app.
 *
 * The relay app runs on the MODEL's phone (not the manager's), so it does NOT
 * carry a Bearer token. Authentication is purely via:
 *   - X-Installation-Id  -> identifies the bound device
 *   - X-Device-Secret    -> shared relay secret, compared against DEVICE_SECRET
 *
 * On success it attaches `req.relayBinding`, `req.agencyId` and `req.installationId`
 * so downstream controllers can scope/route Socket.IO events to the correct agency.
 */
module.exports = async (req, res, next) => {
  try {
    const installationId = req.headers['x-installation-id'] || req.body?.installationId;
    const deviceSecret = req.headers['x-device-secret'] || req.body?.secret;

    if (!installationId) {
      return res.status(401).json({ ok: false, message: 'Missing installationId' });
    }

    // Validate the per-device relay secret (constant-time). It is derived server-side
    // as HMAC(DEVICE_SECRET, installationId) and handed to the device at binding time,
    // so nothing shared is ever baked into the distributed relay app.
    const expectedSecret = deriveRelaySecret(String(installationId));
    if (!secureCompare(deviceSecret, expectedSecret)) {
      return res.status(401).json({ ok: false, message: 'Invalid device secret' });
    }

    const binding = await prisma.deviceBinding.findFirst({
      where: { installationId: String(installationId), active: true },
      select: { id: true, installationId: true, userId: true, agencyId: true, profileId: true }
    });

    if (!binding) {
      return res.status(404).json({ ok: false, message: 'Relay device not found' });
    }

    if (!binding.agencyId) {
      return res.status(403).json({ ok: false, message: 'Relay device has no agency' });
    }

    // Attach relay binding context so controllers can route socket events.
    req.relayBinding = binding;
    req.agencyId = String(binding.agencyId);
    req.installationId = String(binding.installationId);

    next();
  } catch (error) {
    logger.error('[Relay Auth] Middleware Error:', error);
    res.status(500).json({ ok: false, message: 'Internal server error during relay auth' });
  }
};
