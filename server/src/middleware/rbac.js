// 5 Exact Roles
const ROLES = {
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  PAYROLL_ADMIN: 'PAYROLL_ADMIN',
  PAYROLL_USER: 'PAYROLL_USER',
  EMPLOYEE: 'EMPLOYEE'
};

/**
 * RBAC Role Authorization Middleware
 * @param  {...string} allowedRoles Allowed role codes e.g. 'ADMIN', 'HR_MANAGER'
 */
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User context missing.' });
    }

    const userRole = req.user.role;

    // ADMIN always has full access to all endpoints
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Your role (${userRole}) is not permitted to perform this action. Required roles: ${allowedRoles.join(', ')}`
    });
  };
}

module.exports = {
  ROLES,
  checkRole
};
