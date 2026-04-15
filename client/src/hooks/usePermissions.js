import { useMemo, useCallback } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions';

export const usePermissions = (activeOperator, dbPermissions) => {
  const normalizeRole = useCallback((role) => {
    if (!role) return 'Operator';
    const roleName = typeof role === 'object' ? role.name : role;
    const r = roleName ? roleName.toUpperCase() : '';

    if (r === 'APP OWNER' || r === 'SUPER_ADMIN' || r === 'SYSTEM ADMIN' || r === 'ROOT') return 'App Owner';
    if (r === 'AGENCY ADMIN' || r === 'AGENCY OWNER' || r === 'OWNER' || r === 'ADMIN') return 'Agency Admin';
    if (r === 'MANAGER' || r === 'SENIOR MANAGER' || r === 'MANAGERKA') return 'Manager';
    if (r === 'SENIOR OPERATOR' || r === 'SO') return 'Senior Operator';
    if (r === 'OPERATOR' || r === 'OP') return 'Operator';
    if (r === 'MODELKA' || r === 'MODEL' || r === 'MODELA') return 'Model';
    
    return roleName;
  }, []);

  const activeRole = useMemo(() => normalizeRole(activeOperator?.role), [activeOperator?.role, normalizeRole]);

  const rolePermissions = useMemo(() => {
    const permissionsMap = { ...DEFAULT_ROLE_PERMISSIONS };
    
    if (dbPermissions) {
      // Merge DB permissions
      permissionsMap[activeRole] = {
        ...(permissionsMap[activeRole] || {}),
        ...dbPermissions
      };
    }
    
    // ENSURE HARDENING: Administrative roles should NEVER see operational tabs in this platform.
    if (activeRole === 'App Owner' || activeRole === 'Agency Admin') {
      permissionsMap[activeRole] = {
        ...permissionsMap[activeRole],
        calendar: false,
        device_setup: false,
        messaging: false,
        relay: false
      };
    }
    
    return permissionsMap;
  }, [activeRole, dbPermissions]);

  const isAllowed = useCallback((permission) => {
    const currentPerms = rolePermissions[activeRole] || rolePermissions['Operator'] || {};
    // Ensure strict boolean evaluation
    return currentPerms[permission] === true;
  }, [rolePermissions, activeRole]);

  return {
    activeRole,
    rolePermissions,
    isAllowed,
    normalizeRole
  };
};
