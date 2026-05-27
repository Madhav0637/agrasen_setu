const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const postRoutes = require('./post.routes');
const pollRoutes = require('./poll.routes');
const paymentRoutes = require('./payment.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const adminTransferRoutes = require('./admin-transfer.routes');
const searchRoutes = require('./search.routes');
const fcmRoutes = require('./fcm.routes');
const configRoutes = require('./config.routes');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public routes
router.use('/auth', authRoutes);

// Protected routes (require authentication)
router.use('/users', auth, userRoutes);
router.use('/roles', auth, roleRoutes);
router.use('/posts', auth, postRoutes);
router.use('/polls', auth, pollRoutes);
router.use('/payments', paymentRoutes); // Has its own auth per-route (webhook is public)
router.use('/notifications', auth, notificationRoutes);
router.use('/admin', auth, adminRoutes);
router.use('/admin', auth, adminTransferRoutes);
router.use('/search', auth, searchRoutes);
router.use('/fcm', auth, fcmRoutes);
router.use('/config', configRoutes); // GET is public, PUT requires auth (handled in route)

module.exports = router;
