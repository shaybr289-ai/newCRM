import useAuthStore from '../store/authStore';

function isAdminUser(user) {
  return (
    user?.userType === 'superAdmin' || user?.userType === 'admin' ||
    user?.user_type === 'superAdmin' || user?.user_type === 'admin'
  );
}

/** Returns module_perms — server returns both camelCase and snake_case keys */
function getModulePerms(user) {
  return user?.modulePerms || user?.module_perms || null;
}

/** Returns button_perms */
function getButtonPerms(user) {
  return user?.buttonPerms || user?.button_perms || null;
}

/** True if user has an assigned profile */
function hasAssignedProfile(user) {
  return !!(user?.profileId || user?.profile_id);
}

/**
 * Returns permission flags for a given module.
 * - Admins/superAdmins: always full access
 * - Users with no profile: full access (unrestricted)
 * - Users with a profile: must have explicit true in module_perms[moduleId][action]
 */
export function usePerms(moduleId) {
  const user = useAuthStore(s => s.user);
  const admin = isAdminUser(user);
  const profiled = hasAssignedProfile(user);
  const mp = getModulePerms(user);
  const bp = getButtonPerms(user);

  const allow = (action) => {
    if (admin) return true;
    if (!profiled) return true;
    return !!mp?.[moduleId]?.[action];
  };

  const canUseButton = (buttonId) => {
    if (admin) return true;
    if (!profiled) return true;
    if (!bp?.[moduleId]) return true;
    // btn_save always follows the module-level edit permission —
    // having edit access implies the ability to save changes.
    if (buttonId === 'btn_save') return allow('edit');
    return bp[moduleId][buttonId] === true;
  };

  return {
    canView:       allow('view'),
    canCreate:     allow('create'),
    canEdit:       allow('edit'),
    canEditFields: allow('editFields'),
    canDelete:     allow('delete'),
    canUseButton,
  };
}

/** Checks only view permission — used in Sidebar, HomePage and route guards. */
export function canViewModule(user, moduleId) {
  if (isAdminUser(user)) return true;
  if (!hasAssignedProfile(user)) return true;
  const mp = getModulePerms(user);
  return !!mp?.[moduleId]?.view;
}
