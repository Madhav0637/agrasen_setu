const express = require('express');
const router = express.Router();
const pollCtrl = require('../controllers/poll.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const { PERMISSIONS } = require('../utils/constants');
const { createPollSchema, voteSchema } = require('../validators/poll.validator');

router.use(auth);

router.get('/', pollCtrl.listPolls);
router.get('/:id', pollCtrl.getPollById);

router.post('/',
  requirePermission(PERMISSIONS.CREATE_POLLS),
  validate({ body: createPollSchema }),
  pollCtrl.createPoll
);

router.post('/:id/vote',
  validate({ body: voteSchema }),
  pollCtrl.vote
);

router.patch('/:id/close',
  requirePermission(PERMISSIONS.MANAGE_POLLS),
  pollCtrl.closePoll
);

router.delete('/:id', pollCtrl.deletePoll);

module.exports = router;
