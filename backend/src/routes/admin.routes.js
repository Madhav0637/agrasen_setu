const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const { PERMISSIONS } = require('../utils/constants');

router.use(auth);

router.get('/dashboard',
  requirePermission(PERMISSIONS.VIEW_DASHBOARD),
  adminCtrl.getDashboard
);

router.get('/audit-logs',
  requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS),
  adminCtrl.getAuditLogs
);

module.exports = router;
