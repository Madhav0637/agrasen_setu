const express = require('express');
const router = express.Router();
const searchCtrl = require('../controllers/search.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/users', searchCtrl.searchUsers);
router.get('/posts', searchCtrl.searchPosts);

module.exports = router;
