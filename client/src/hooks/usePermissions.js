import { useMemo, useCallback } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions';
import { normalizeRole } from '../utils/roleUtils';

export const usePermissions = (activeOperator, dbPermissions) => {
  const activeRole = useMemo(() => {
    return normalizeRole(activeOperator?.role || activeOperator?.roleName || '');
  }, [activeOperator]);

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
    const roleKey = activeRole || 'operator';
    // Find matching key in permissions map (case-insensitive and normalized)
    const availableRoles = Object.keys(rolePermissions);
    const matchedRole = availableRoles.find(r => normalizeRole(r) === normalizeRole(roleKey)) || 'Operator';
    
    const currentPerms = rolePermissions[matchedRole] || {};
    return currentPerms[permission] === true;
  }, [rolePermissions, activeRole]);

  return {
    activeRole,
    rolePermissions,
    isAllowed,
    normalizeRole
  };
};
