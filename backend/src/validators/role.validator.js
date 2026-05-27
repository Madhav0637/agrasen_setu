const { z } = require('zod');

const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(255).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).optional().nullable(),
});

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1, 'At least one permission is required'),
});

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  assignRoleSchema,
};
