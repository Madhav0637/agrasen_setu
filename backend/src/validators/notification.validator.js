const { z } = require('zod');

const sendNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  channel: z.enum(['SMS', 'WHATSAPP', 'PUSH', 'IN_APP']),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

const bulkNotificationSchema = z.object({
  target: z.enum(['ALL', 'ROLE', 'PAYMENT_PENDING']),
  roleId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  channel: z.enum(['SMS', 'WHATSAPP', 'PUSH', 'IN_APP']),
});

module.exports = {
  sendNotificationSchema,
  bulkNotificationSchema,
};
