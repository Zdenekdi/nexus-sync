import { useMemo, useCallback } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions';

export const usePermissions = (activeOperator, dbPermissions) => {
  const normalizeRole = useCallback((role) => {
    if (!role) return role;
    const roleName = typeof role === 'object' ? role.name : role;
    if (roleName === 'App Owner' || roleName === 'SUPER_ADMIN' || roleName === 'ROOT') return 'App Owner';
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
