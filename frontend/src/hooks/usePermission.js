import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if the current user has specific permissions
 */
export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permissionCode) => {
    if (!user?.userRoles) return false;
    return user.userRoles.some((ur) =>
      ur.role?.permissions?.some((rp) => rp.permission?.code === permissionCode)
    );
  };

  const hasAnyPermission = (...permissionCodes) => {
    return permissionCodes.some(hasPermission);
  };

  const hasAllPermissions = (...permissionCodes) => {
    return permissionCodes.every(hasPermission);
  };

  const isAdmin = () => {
    if (!user?.userRoles) return false;
    return user.userRoles.some((ur) => ur.role?.name === 'Admin');
  };

  return { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin };
}
