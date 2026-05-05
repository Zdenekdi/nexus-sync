const prisma = require('../services/db');
const { isEffectiveAdmin } = require('./roleController');
const crypto = require('crypto');

// Utility: log an audit event (call from other controllers)
exports.logAction = async (agencyId, userId, action, details = null) => {
  try {
    // 1. Get the last log's hash to build the chain
    const lastLog = await prisma.auditLog.findFirst({
      where: { agencyId },
      orderBy: { timestamp: 'desc' }
    });
    const previousHash = lastLog?.integrityHash || 'NEXUS_ROOT_HASH';

    // 2. Prepare data for hashing
    const timestamp = new Date();
    const dataToHash = `${agencyId}|${userId}|${action}|${JSON.stringify(details)}|${timestamp.toISOString()}|${previousHash}`;
    
    // 3. Calculate SHA-256 hash
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // 4. Create log entry
    await prisma.auditLog.create({
      data: { 
        agencyId, 
        userId, 
        action, 
        details, 
        timestamp,
        integrityHash: hash // Store the signature
      }
    });
  } catch (err) {
    console.error('Audit log write error:', err);
  }
};

// GET /api/audit-logs — list audit logs for the agency
exports.getAuditLogs = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    const effectiveAdmin = await isEffectiveAdmin(role, agencyId);

    // Only Agency Admin (or merged Manager) or App Owner can access audit logs
    if (!effectiveAdmin && !role?.isAppOwner) {
      return res.status(403).json({ message: 'Only Agency Admin can access audit logs' });
    }

    const { page = 1, limit = 50, action, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = role?.isAppOwner ? {} : { agencyId };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        action: l.action,
        details: l.details,
        userName: l.user?.name || 'System',
        userEmail: l.user?.email || null,
        timestamp: l.timestamp,
        hash: l.integrityHash // Exposed for UI validation
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};
