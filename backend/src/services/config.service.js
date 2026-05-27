const prisma = require('../config/database');
const logger = require('../utils/logger');
const { SYSTEM_CONFIG_KEYS } = require('../utils/constants');

/**
 * System Configuration Service — admin-editable key-value settings
 */
class ConfigService {
  /**
   * Get a config value by key
   */
  async get(key) {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    return config?.value || null;
  }

  /**
   * Set a config value
   */
  async set(key, value, label) {
    return prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, label: label || key },
    });
  }

  /**
   * Get all config values
   */
  async getAll() {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value map
    const map = {};
    for (const c of configs) {
      map[c.key] = { value: c.value, label: c.label };
    }
    return map;
  }

  /**
   * Get membership fee (from config or fallback to plan)
   */
  async getMembershipFee() {
    const fee = await this.get(SYSTEM_CONFIG_KEYS.MEMBERSHIP_FEE);
    if (fee) return parseFloat(fee);

    // Fallback: read from active plan
    const plan = await prisma.membershipPlan.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return plan ? parseFloat(plan.amount) : 1000;
  }

  /**
   * Update membership fee (updates both config and active plan)
   */
  async setMembershipFee(amount) {
    await this.set(SYSTEM_CONFIG_KEYS.MEMBERSHIP_FEE, String(amount), 'Membership Fee (₹)');

    // Also update the active membership plan
    const plan = await prisma.membershipPlan.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (plan) {
      await prisma.membershipPlan.update({
        where: { id: plan.id },
        data: { amount },
      });
    }

    logger.info({ amount }, 'Membership fee updated');
    return amount;
  }
}

module.exports = new ConfigService();
