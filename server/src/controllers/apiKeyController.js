const prisma = require('../services/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../services/logger');
const { isEffectiveAdmin } = require('./roleController');

/**
 * Generate a new API key for the agency.
 * Returns the plain text key (only shown once).
 */
exports.createKey = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const { name, scopes } = req.body;

    // 1. Check permissions (Must be an effective admin)
    const isAdmin = await isEffectiveAdmin(role, agencyId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only agency administrators can manage API keys' });
    }

    // 2. Validate Agency Plan
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    const allowedPlans = ['Agency', 'Professional', 'Enterprise'];
    if (!allowedPlans.includes(agency.plan || agency.tier)) {
      return res.status(403).json({ message: 'Public API access requires an Agency plan' });
    }

    // 3. Generate Key Parts
    const keyId = `nx_live_${crypto.randomBytes(6).toString('hex')}`;
    const secretPart = crypto.randomBytes(32).toString('base64').replace(/[/+=]/g, ''); // Clean alphanumeric-ish secret
    const fullKey = `${keyId}.${secretPart}`;
    
    // 4. Hash Secret and Save
    const keyHash = await bcrypt.hash(secretPart, 10);
    
    await prisma.apiKey.create({
      data: {
        keyId,
        keyHash,
        name: name || 'Default Key',
        scopes: scopes || 'read:stats',
        agencyId
      }
    });

    logger.info(`[API Controller] New API key generated for Agency ${agencyId} by User ${req.user.userId}`);

    res.status(201).json({
      message: 'API key generated successfully. Please save it now, it will never be shown again.',
      apiKey: fullKey,
      name: name || 'Default Key'
    });
  } catch (error) {
    logger.error('[API Controller] createKey ERROR:', error);
    res.status(500).json({ message: 'Failed to generate API key' });
  }
};

/**
 * List all active API keys for the agency.
 */
exports.listKeys = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    
    const isAdmin = await isEffectiveAdmin(role, agencyId);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const keys = await prisma.apiKey.findMany({
      where: { agencyId },
      select: {
        id: true,
        keyId: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(keys);
  } catch (error) {
    logger.error('[API Controller] listKeys ERROR:', error);
    res.status(500).json({ message: 'Failed to fetch API keys' });
  }
};

/**
 * Revoke (delete) an API key.
 */
exports.revokeKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { agencyId, role } = req.user;

    const isAdmin = await isEffectiveAdmin(role, agencyId);
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    // Ensure the key belongs to the user's agency
    const key = await prisma.apiKey.findFirst({
      where: { id, agencyId }
    });

    if (!key) {
      return res.status(404).json({ message: 'API key not found or already revoked' });
    }

    await prisma.apiKey.delete({ where: { id } });
    
    logger.info(`[API Controller] API key ${id} revoked by User ${req.user.userId}`);
    res.json({ message: 'API key successfully revoked' });
  } catch (error) {
    logger.error('[API Controller] revokeKey ERROR:', error);
    res.status(500).json({ message: 'Failed to revoke API key' });
  }
};
