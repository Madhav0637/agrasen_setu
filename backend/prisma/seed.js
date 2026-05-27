const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLES,
  MANAGER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  ORG_NAME,
  SYSTEM_CONFIG_KEYS,
} = require('../src/utils/constants');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log('🌱 Seeding database for', ORG_NAME, '...\n');

  // 1. Create all permissions
  console.log('Creating permissions...');
  const permissions = {};
  for (const perm of PERMISSION_DEFINITIONS) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
    permissions[perm.code] = created;
    console.log(`  ✅ ${perm.code}`);
  }

  // 2. Create default roles (no hidden roles — Admin is just a regular RBAC role)
  console.log('\nCreating roles...');

  // ---- Admin role (all permissions) ----
  const adminRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.ADMIN },
    update: { description: 'Full system access (single admin)', isSystem: true },
    create: {
      name: DEFAULT_ROLES.ADMIN,
      description: 'Full system access (single admin)',
      isSystem: true,
    },
  });
  console.log(`  ✅ ${DEFAULT_ROLES.ADMIN}`);

  // Assign all admin-level permissions
  for (const permCode of ADMIN_PERMISSIONS) {
    const perm = permissions[permCode];
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  // ---- Manager role ----
  const managerRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.MANAGER },
    update: { description: 'Community manager with limited admin access', isSystem: true },
    create: {
      name: DEFAULT_ROLES.MANAGER,
      description: 'Community manager with limited admin access',
      isSystem: true,
    },
  });
  console.log(`  ✅ ${DEFAULT_ROLES.MANAGER}`);

  for (const permCode of MANAGER_PERMISSIONS) {
    const perm = permissions[permCode];
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      });
    }
  }

  // ---- Member role ----
  await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.MEMBER },
    update: { description: 'Regular community member', isSystem: true },
    create: {
      name: DEFAULT_ROLES.MEMBER,
      description: 'Regular community member',
      isSystem: true,
    },
  });
  console.log(`  ✅ ${DEFAULT_ROLES.MEMBER}`);

  // 3. Seed admin from SEED_ADMIN_PHONE environment variable
  const seedAdminPhone = process.env.SEED_ADMIN_PHONE;
  if (seedAdminPhone) {
    console.log(`\n👑 Seeding admin user (phone: ${seedAdminPhone})...`);

    const adminUser = await prisma.user.upsert({
      where: { phone: seedAdminPhone },
      update: { status: 'APPROVED' },
      create: {
        name: 'Admin',
        phone: seedAdminPhone,
        status: 'APPROVED',
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
    console.log('  ✅ Admin user created/updated with Admin role');
  } else {
    console.log('\n⚠️  No SEED_ADMIN_PHONE set — skipping admin user seeding');
  }

  // 4. Clean up legacy Super_Admin role & data (if exists from old schema)
  console.log('\n🧹 Cleaning up legacy Super_Admin artifacts...');
  try {
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super_Admin' } });
    if (superAdminRole) {
      // Remove all user-role assignments for Super_Admin
      await prisma.userRole.deleteMany({ where: { roleId: superAdminRole.id } });
      // Remove all role-permission assignments
      await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
      // Delete the role itself
      await prisma.role.delete({ where: { id: superAdminRole.id } });
      console.log('  🗑️  Deleted legacy Super_Admin role and its assignments');
    } else {
      console.log('  ✅ No legacy Super_Admin role found');
    }
  } catch (err) {
    console.log('  ⚠️  Could not clean up Super_Admin:', err.message);
  }

  // 5. Create default membership plan
  console.log('\nCreating default membership plan...');
  await prisma.membershipPlan.upsert({
    where: { id: 'default-plan' },
    update: {},
    create: {
      id: 'default-plan',
      name: `${ORG_NAME} — वार्षिक सदस्यता`,
      amount: 1000.00,
      currency: 'INR',
      cycleDayOfMonth: 31,
      cycleMonth: 3,
      isActive: true,
    },
  });
  console.log('  ✅ Default membership plan created (₹1,000)');

  // 6. Create default system config
  console.log('\nSetting up system configuration...');

  const defaultConfigs = [
    { key: SYSTEM_CONFIG_KEYS.MEMBERSHIP_FEE, value: '1000', label: 'सदस्यता शुल्क (₹)' },
    { key: SYSTEM_CONFIG_KEYS.ORG_NAME, value: ORG_NAME, label: 'संस्था का नाम' },
    { key: SYSTEM_CONFIG_KEYS.ORG_DESCRIPTION, value: 'जसपुर की अग्रवाल समाज का एक सामुदायिक मंच', label: 'संस्था का विवरण' },
    { key: SYSTEM_CONFIG_KEYS.PAYMENT_DEADLINE_MONTH, value: '3', label: 'भुगतान की अंतिम तिथि (महीना)' },
  ];

  for (const config of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
    console.log(`  ✅ ${config.key}: ${config.value}`);
  }

  console.log('\n🎉 Seed completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
