const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/payment.controller');
const { auth } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const validate = require('../middlewares/validate');
const { PERMISSIONS } = require('../utils/constants');
const {
  createOrderSchema,
  verifyPaymentSchema,
  createPlanSchema,
} = require('../validators/payment.validator');

// Webhook — no auth, uses signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), paymentCtrl.webhook);

// Authenticated routes
router.use(auth);

// Membership plans
router.get('/plans', paymentCtrl.listPlans);
router.post('/plans',
  requirePermission(PERMISSIONS.MANAGE_PAYMENTS),
  validate({ body: createPlanSchema }),
  paymentCtrl.createPlan
);

// Payment operations
router.get('/me', paymentCtrl.getMyPayments);
router.post('/create-order', validate({ body: createOrderSchema }), paymentCtrl.createOrder);
router.post('/verify', validate({ body: verifyPaymentSchema }), paymentCtrl.verifyPayment);

// Admin payment views
router.get('/', requirePermission(PERMISSIONS.VIEW_PAYMENTS), paymentCtrl.listPayments);
router.get('/stats', requirePermission(PERMISSIONS.VIEW_PAYMENTS), paymentCtrl.getPaymentStats);

module.exports = router;
