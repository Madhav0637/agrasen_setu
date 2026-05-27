const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const auditLog = require('../middlewares/auditLog');
const { PERMISSIONS } = require('../utils/constants');
const {
  updateUserSchema,
  updateUserStatusSchema,
  addFamilyRelationSchema,
} = require('../validators/user.validator');

// All routes require authentication
router.use(auth);

// Current user
router.get('/me', userCtrl.getMe);
router.post('/me/profile-picture', upload.single('file'), userCtrl.uploadProfilePicture);
router.post('/me/id-proof', upload.single('file'), userCtrl.uploadIdProof);

// User management
router.get('/', requirePermission(PERMISSIONS.VIEW_USERS), userCtrl.listUsers);
router.get('/:id', userCtrl.getUserById);
router.put('/:id', validate({ body: updateUserSchema }), userCtrl.updateUser);
router.patch('/:id/status',
  requirePermission(PERMISSIONS.APPROVE_MEMBERS),
  validate({ body: updateUserStatusSchema }),
  auditLog('UPDATE_STATUS', 'User'),
  userCtrl.updateUserStatus
);

// Family relations
router.get('/:id/family', userCtrl.getFamilyRelations);
router.post('/:id/family',
  validate({ body: addFamilyRelationSchema }),
  userCtrl.addFamilyRelation
);
router.delete('/:id/family/:relationId', userCtrl.removeFamilyRelation);

module.exports = router;
