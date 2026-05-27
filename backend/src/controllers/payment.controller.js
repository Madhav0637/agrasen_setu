const paymentService = require('../services/payment.service');

const listPlans = async (req, res, next) => {
  try {
    const plans = await paymentService.listPlans();
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const plan = await paymentService.createPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createOrder(
      req.user.id,
      req.body.planId,
      req.body.membershipYear
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(
      req.body.razorpayOrderId,
      req.body.razorpayPaymentId,
      req.body.razorpaySignature
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await paymentService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getUserPayments(req.user.id);
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

const listPayments = async (req, res, next) => {
  try {
    const result = await paymentService.listPayments(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getPaymentStats = async (req, res, next) => {
  try {
    const stats = await paymentService.getPaymentStats(req.query.year);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPlans,
  createPlan,
  createOrder,
  verifyPayment,
  webhook,
  getMyPayments,
  listPayments,
  getPaymentStats,
};
