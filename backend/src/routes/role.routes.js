const express = require('express');
const router = express.Router();
const roleCtrl = require('../controllers/role.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { PERMISSIONS } = require('../utils/constants');
const {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  assignRoleSchema,
} = require('../validators/role.validator');

router.use(auth);

// Roles
router.get('/', requirePermission(PERMISSIONS.MANAGE_ROLES), roleCtrl.listRoles);
router.post('/',
  requirePermission(PERMISSIONS.MANAGE_ROLES),
  validate({ body: createRoleSchema }),
  auditLog('CREATE', 'Role'),
  roleCtrl.createRole
);
router.put('/:id',
  requirePermission(PERMISSIONS.MANAGE_ROLES),
  validate({ body: updateRoleSchema }),
  auditLog('UPDATE', 'Role'),
  roleCtrl.updateRole
);
router.delete('/:id',
  requirePermission(PERMISSIONS.MANAGE_ROLES),
  auditLog('DELETE', 'Role'),
  roleCtrl.deleteRole
);

// Permissions
router.get('/permissions', requirePermission(PERMISSIONS.MANAGE_ROLES), roleCtrl.listPermissions);
router.post('/:id/permissions',
  requirePermission(PERMISSIONS.MANAGE_ROLES),
  validate({ body: assignPermissionsSchema }),
  auditLog('ASSIGN_PERMISSIONS', 'Role'),
  roleCtrl.assignPermissions
);

// User role assignment — mounted under /api/users/:id/roles in main router
// But also accessible here for convenience
router.post('/users/:id/roles',
  requirePermission(PERMISSIONS.ASSIGN_ROLES),
  validate({ body: assignRoleSchema }),
  auditLog('ASSIGN_ROLE', 'User'),
  roleCtrl.assignRoleToUser
);
router.delete('/users/:id/roles/:roleId',
  requirePermission(PERMISSIONS.ASSIGN_ROLES),
  auditLog('REMOVE_ROLE', 'User'),
  roleCtrl.removeRoleFromUser
);

module.exports = router;
