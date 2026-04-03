import { useMemo, useCallback } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions';

export const usePermissions = (activeOperator, dbPermissions) => {
  const normalizeRole = useCallback((role) => {
    if (!role) return 'Operator'; // Default fallback
    const roleName = typeof role === 'object' ? role.name : role;
    const r = roleName ? roleName.toUpperCase() : '';

    if (r === 'APP OWNER' || r === 'SUPER_ADMIN' || r === 'ROOT') return 'App Owner';
    if (r === 'AGENCY ADMIN' || r === 'AGENCY OWNER' || r === 'OWNER') return 'Agency Admin';
    if (r === 'MANAGER' || r === 'SENIOR MANAGER' || r === 'MANAGERKA') return 'Manager';
    if (r === 'OPERATOR' || r === 'SENIOR OPERATOR' || r === 'OP') return 'Operator';
    if (r === 'MODELKA' || r === 'MODEL' || r === 'MODELA') return 'Model';
    
    return roleName;
  }, []);

  const activeRole = useMemo(() => normalizeRole(activeOperator?.role), [activeOperator?.role, normalizeRole]);

  const rolePermissions = useMemo(() => {
    const permissionsMap = { ...DEFAULT_ROLE_PERMISSIONS };
    
    if (dbPermissions) {
      permissionsMap[activeRole] = {
        ...(permissionsMap[activeRole] || {}),
        ...dbPermissions
      };
    }
    
    return permissionsMap;
  }, [activeRole, dbPermissions]);

  const isAllowed = useCallback((permission) => {
    const currentPerms = rolePermissions[activeRole] || rolePermissions['Operator'] || {};
    return currentPerms[permission] === true;
  }, [rolePermissions, activeRole]);

  return {
    activeRole,
    rolePermissions,
    isAllowed,
    normalizeRole
  };
};
