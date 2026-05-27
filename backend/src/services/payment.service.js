const crypto = require('crypto');
const prisma = require('../config/database');
const razorpay = require('../config/razorpay');
const env = require('../config/env');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const logger = require('../utils/logger');

class PaymentService {
  /**
   * List membership plans
   */
  async listPlans() {
    return prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create or update a membership plan
   */
  async createPlan(data) {
    return prisma.membershipPlan.create({ data });
  }

  /**
   * Create a Razorpay order for membership payment
   */
  async createOrder(userId, planId, membershipYear) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Plan not found');
    if (!plan.isActive) throw new BadRequestError('Plan is not active');

    // Check if payment already exists for this year
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        membershipYear,
        status: 'PAID',
      },
    });

    if (existingPayment) {
      throw new ConflictError('Membership already paid for this year');
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(Number(plan.amount) * 100), // Convert to paise
      currency: plan.currency,
      receipt: `membership_${userId}_${membershipYear}`,
      notes: {
        userId,
        planId,
        membershipYear: membershipYear.toString(),
      },
    });

    // Save payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        planId,
        amount: plan.amount,
        currency: plan.currency,
        razorpayOrderId: order.id,
        membershipYear,
        status: 'PENDING',
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
      keyId: env.RAZORPAY_KEY_ID,
    };
  }

  /**
   * Verify payment signature from Razorpay
   */
  async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new BadRequestError('Payment verification failed — invalid signature');
    }

    // Update payment record
    const payment = await prisma.payment.update({
      where: { razorpayOrderId },
      data: {
        status: 'PAID',
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date(),
      },
    });

    logger.info({ paymentId: payment.id, userId: payment.userId }, 'Payment verified');
    return payment;
  }

  /**
   * Handle Razorpay webhook
   */
  async handleWebhook(payload, signature) {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestError('Invalid webhook signature');
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity) return { status: 'ignored' };

    switch (event) {
      case 'payment.captured': {
        const orderId = paymentEntity.order_id;
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: orderId },
        });

        if (payment && payment.status !== 'PAID') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              razorpayPaymentId: paymentEntity.id,
              paidAt: new Date(),
            },
          });
          logger.info({ paymentId: payment.id }, 'Payment captured via webhook');
        }
        break;
      }

      case 'payment.failed': {
        const orderId = paymentEntity.order_id;
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: orderId },
        });

        if (payment && payment.status === 'PENDING') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          logger.warn({ paymentId: payment.id }, 'Payment failed via webhook');
        }
        break;
      }

      default:
        logger.info({ event }, 'Unhandled webhook event');
    }

    return { status: 'processed' };
  }

  /**
   * Get payment history for a user
   */
  async getUserPayments(userId) {
    return prisma.payment.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List all payments (admin)
   */
  async listPayments(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    if (query.status) where.status = query.status;
    if (query.year) where.membershipYear = parseInt(query.year, 10);
    if (query.userId) where.userId = query.userId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, phone: true },
          },
          plan: true,
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return paginatedResponse(payments, total, page, limit);
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(year) {
    const membershipYear = year || new Date().getFullYear();

    const [totalPaid, totalPending, totalAmount] = await Promise.all([
      prisma.payment.count({
        where: { membershipYear, status: 'PAID' },
      }),
      prisma.payment.count({
        where: { membershipYear, status: 'PENDING' },
      }),
      prisma.payment.aggregate({
        where: { membershipYear, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      membershipYear,
      totalPaid,
      totalPending,
      totalCollected: totalAmount._sum.amount || 0,
    };
  }
}

module.exports = new PaymentService();
