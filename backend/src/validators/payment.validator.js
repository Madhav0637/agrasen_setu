const { z } = require('zod');

const createOrderSchema = z.object({
  planId: z.string().uuid(),
  membershipYear: z.number().int().min(2024).max(2100),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  cycleDayOfMonth: z.number().int().min(1).max(31).default(31),
  cycleMonth: z.number().int().min(1).max(12).default(3),
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  createPlanSchema,
};
