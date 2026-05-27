const express = require('express');
const router = express.Router();
const postCtrl = require('../controllers/post.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { PERMISSIONS } = require('../utils/constants');
const { createPostSchema, updatePostSchema } = require('../validators/post.validator');

router.use(auth);

router.get('/', postCtrl.listPosts);
router.get('/:id', postCtrl.getPostById);

router.post('/',
  requirePermission(PERMISSIONS.CREATE_POSTS),
  upload.array('files', 5),
  validate({ body: createPostSchema }),
  postCtrl.createPost
);

router.put('/:id',
  requirePermission(PERMISSIONS.CREATE_POSTS),
  validate({ body: updatePostSchema }),
  postCtrl.updatePost
);

router.delete('/:id', postCtrl.deletePost);

router.patch('/:id/pin',
  requirePermission(PERMISSIONS.MANAGE_POSTS),
  postCtrl.togglePin
);

module.exports = router;
