const prisma = require('../services/db');

// Utility: log an audit event (call from other controllers)
exports.logAction = async (agencyId, userId, action, details = null) => {
  try {
    await prisma.auditLog.create({
      data: { agencyId, userId, action, details }
    });
  } catch (err) {
    console.error('Audit log write error:', err);
  }
};

// GET /api/audit-logs — list audit logs for the agency
exports.getAuditLogs = async (req, res) => {
  try {
    const { agencyId, role } = req.user;
    if (!role?.isManager && !role?.isAppOwner) {
      return res.status(403).json({ message: 'Access denied' });
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
        timestamp: l.timestamp
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
