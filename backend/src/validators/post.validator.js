const { z } = require('zod');

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  type: z.enum(['POST', 'ANNOUNCEMENT']).default('POST'),
  isPinned: z.boolean().default(false),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['POST', 'ANNOUNCEMENT']).optional(),
  isPinned: z.boolean().optional(),
});

const postQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(['POST', 'ANNOUNCEMENT']).optional(),
  search: z.string().optional(),
  pinned: z.string().optional(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  postQuerySchema,
};
