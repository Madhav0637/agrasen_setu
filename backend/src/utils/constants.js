// Permission codes
const PERMISSIONS = {
  MANAGE_USERS: 'MANAGE_USERS',
  APPROVE_MEMBERS: 'APPROVE_MEMBERS',
  VIEW_USERS: 'VIEW_USERS',
  CREATE_POSTS: 'CREATE_POSTS',
  MANAGE_POSTS: 'MANAGE_POSTS',
  CREATE_POLLS: 'CREATE_POLLS',
  MANAGE_POLLS: 'MANAGE_POLLS',
  VIEW_PAYMENTS: 'VIEW_PAYMENTS',
  MANAGE_PAYMENTS: 'MANAGE_PAYMENTS',
  SEND_NOTIFICATIONS: 'SEND_NOTIFICATIONS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  ASSIGN_ROLES: 'ASSIGN_ROLES',
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  TRANSFER_ADMIN: 'TRANSFER_ADMIN',
  MANAGE_CONFIG: 'MANAGE_CONFIG',
};

// Default permission definitions for seeding
const PERMISSION_DEFINITIONS = [
  { code: 'MANAGE_USERS', name: 'Manage Users', description: 'Create, edit, delete users', module: 'users' },
  { code: 'APPROVE_MEMBERS', name: 'Approve Members', description: 'Approve or reject member registrations', module: 'users' },
  { code: 'VIEW_USERS', name: 'View Users', description: 'View member directory', module: 'users' },
  { code: 'CREATE_POSTS', name: 'Create Posts', description: 'Create posts and announcements', module: 'content' },
  { code: 'MANAGE_POSTS', name: 'Manage Posts', description: 'Edit/delete any post, pin announcements', module: 'content' },
  { code: 'CREATE_POLLS', name: 'Create Polls', description: 'Create polls', module: 'content' },
  { code: 'MANAGE_POLLS', name: 'Manage Polls', description: 'Close/delete any poll', module: 'content' },
  { code: 'VIEW_PAYMENTS', name: 'View Payments', description: 'View all payment data', module: 'payments' },
  { code: 'MANAGE_PAYMENTS', name: 'Manage Payments', description: 'Create plans, manage payment records', module: 'payments' },
  { code: 'SEND_NOTIFICATIONS', name: 'Send Notifications', description: 'Send notifications to users', module: 'notifications' },
  { code: 'MANAGE_ROLES', name: 'Manage Roles', description: 'Create/edit roles and permissions', module: 'roles' },
  { code: 'ASSIGN_ROLES', name: 'Assign Roles', description: 'Assign roles to users', module: 'roles' },
  { code: 'VIEW_DASHBOARD', name: 'View Dashboard', description: 'Access admin dashboard', module: 'admin' },
  { code: 'VIEW_AUDIT_LOGS', name: 'View Audit Logs', description: 'View audit trail', module: 'admin' },
  { code: 'TRANSFER_ADMIN', name: 'Transfer Admin', description: 'Transfer admin role to another user', module: 'admin' },
  { code: 'MANAGE_CONFIG', name: 'Manage Config', description: 'Manage system configuration', module: 'admin' },
];

// Default roles — Admin is just a regular RBAC role (no hidden super admin)
const DEFAULT_ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
};

// Manager permissions (subset of all)
const MANAGER_PERMISSIONS = [
  'VIEW_USERS',
  'APPROVE_MEMBERS',
  'CREATE_POSTS',
  'MANAGE_POSTS',
  'CREATE_POLLS',
  'MANAGE_POLLS',
  'VIEW_PAYMENTS',
  'SEND_NOTIFICATIONS',
  'VIEW_DASHBOARD',
];

// Admin permissions (all permissions)
const ADMIN_PERMISSIONS = [
  'MANAGE_USERS',
  'APPROVE_MEMBERS',
  'VIEW_USERS',
  'CREATE_POSTS',
  'MANAGE_POSTS',
  'CREATE_POLLS',
  'MANAGE_POLLS',
  'VIEW_PAYMENTS',
  'MANAGE_PAYMENTS',
  'SEND_NOTIFICATIONS',
  'MANAGE_ROLES',
  'ASSIGN_ROLES',
  'VIEW_DASHBOARD',
  'VIEW_AUDIT_LOGS',
  'TRANSFER_ADMIN',
  'MANAGE_CONFIG',
];

// OTP configuration
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Relation type inverses (for bidirectional family linking)
const RELATION_INVERSES = {
  FATHER: 'SON',
  MOTHER: 'SON',
  WIFE: 'HUSBAND',
  HUSBAND: 'WIFE',
  SON: 'FATHER',
  DAUGHTER: 'FATHER',
  BROTHER: 'BROTHER',
  SISTER: 'SISTER',
  OTHER: 'OTHER',
};

// Organization
const ORG_NAME = 'Shri Agrawal Sabha Jaspur';

// Default system config keys
const SYSTEM_CONFIG_KEYS = {
  MEMBERSHIP_FEE: 'membership_fee',
  ORG_NAME: 'org_name',
  ORG_DESCRIPTION: 'org_description',
  PAYMENT_DEADLINE_MONTH: 'payment_deadline_month',
};

module.exports = {
  PERMISSIONS,
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLES,
  MANAGER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  OTP_CONFIG,
  PAGINATION,
  RELATION_INVERSES,
  ORG_NAME,
  SYSTEM_CONFIG_KEYS,
};
