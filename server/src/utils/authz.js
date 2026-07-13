const { normalizeRole } = require('./roleUtils');

const roleName = (role) => {
  if (!role) return '';
  return typeof role === 'string' ? role : role.name || '';
};

const normalizedRoleName = (role) => normalizeRole(roleName(role));

const isAppOwnerRole = (role) => {
  const normalized = normalizedRoleName(role);
  return Boolean(role?.isAppOwner) || normalized === 'app_owner' || normalized === 'owner';
};

const isManagerRole = (role) => {
  const normalized = normalizedRoleName(role);
  return Boolean(role?.isManager) ||
    isAppOwnerRole(role) ||
    ['agency_admin', 'admin', 'manager', 'senior_manager', 'senior_operator'].includes(normalized);
};

const requireAppOwner = (req, res, next) => {
  if (!isAppOwnerRole(req.user?.role)) {
    return res.status(403).json({ message: 'Access denied: App Owner role required' });
  }
  next();
};

// Manager+ (Agency Admin / Senior Operator / App Owner). Operatoři a Modelky ne.
const requireManager = (req, res, next) => {
  if (!isManagerRole(req.user?.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

module.exports = {
  roleName,
  normalizedRoleName,
  isAppOwnerRole,
  isManagerRole,
  requireAppOwner,
  requireManager
};
