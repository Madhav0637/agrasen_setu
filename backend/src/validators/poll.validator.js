const { z } = require('zod');

const createPollSchema = z.object({
  question: z.string().min(5).max(500),
  description: z.string().max(1000).optional(),
  options: z.array(z.string().min(1).max(255)).min(2).max(10),
  endsAt: z.string().datetime().optional(),
  isAnonymous: z.boolean().optional().default(true),
});

const voteSchema = z.object({
  optionId: z.string().uuid(),
});

module.exports = {
  createPollSchema,
  voteSchema,
};
