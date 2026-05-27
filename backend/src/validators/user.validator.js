const { z } = require('zod');

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: z.string().max(500).optional(),
});

const addFamilyRelationSchema = z.object({
  relatedUserId: z.string().uuid(),
  relationType: z.enum([
    'FATHER', 'MOTHER', 'WIFE', 'HUSBAND',
    'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'OTHER',
  ]),
});

const userQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  search: z.string().optional(),
  role: z.string().optional(),
});

module.exports = {
  updateUserSchema,
  updateUserStatusSchema,
  addFamilyRelationSchema,
  userQuerySchema,
};
