/**
 * System-wide permission definitions.
 * These are seeded into the `permissions` table on first migration.
 *
 * Format: `{resource}.{action}` — e.g., `users.read`, `products.write`
 */

export const SYSTEM_PERMISSIONS = [
  // Users
  'users.create',
  'users.read',
  'users.update',
  'users.delete',

  // Roles
  'roles.create',
  'roles.read',
  'roles.update',
  'roles.delete',

  // Permissions
  'permissions.read',

  // Products (Fase 2)
  'products.create',
  'products.read',
  'products.update',
  'products.delete',

  // Stock (Fase 2)
  'stock.read',
  'stock.update',

  // Sales (Fase 2)
  'sales.create',
  'sales.read',
  'sales.update',
  'sales.delete',

  // Caja (Fase 2)
  'caja.read',
  'caja.update',

  // Reports
  'reports.read',
] as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[number];
