import { DataSource } from 'typeorm';
import { Permission } from '../../entities/permission.entity';
import { Role } from '../../entities/role.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { Tenant } from '../../entities/tenant.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../entities/user-role.entity';
import * as bcrypt from 'bcrypt';

/**
 * Seed script for system permissions, default roles, and admin user.
 *
 * Permissions are global (no tenant_id). Roles are created for the default
 * tenant (or the first tenant found).
 *
 * Safe to run multiple times — skips existing records via find-then-insert.
 */
export async function seedRolesPermissions(dataSource: DataSource): Promise<void> {
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const rolePermissionRepo = dataSource.getRepository(RolePermission);
  const tenantRepo = dataSource.getRepository(Tenant);
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  // ──────────────────────────────────────────────
  // 1. Seed Permissions (global — no tenant_id)
  // ──────────────────────────────────────────────

  const permissionsData = [
    { resource: 'users', action: 'read', name: 'Ver usuarios' },
    { resource: 'users', action: 'write', name: 'Crear/editar usuarios' },
    { resource: 'users', action: 'delete', name: 'Eliminar usuarios' },
    { resource: 'roles', action: 'read', name: 'Ver roles' },
    { resource: 'roles', action: 'write', name: 'Crear/editar roles' },
    { resource: 'roles', action: 'delete', name: 'Eliminar roles' },
    { resource: 'products', action: 'read', name: 'Ver productos' },
    { resource: 'products', action: 'write', name: 'Crear/editar productos' },
    { resource: 'products', action: 'delete', name: 'Eliminar productos' },
    { resource: 'stock', action: 'read', name: 'Ver stock' },
    { resource: 'stock', action: 'write', name: 'Ajustar stock' },
    { resource: 'sales', action: 'read', name: 'Ver ventas' },
    { resource: 'sales', action: 'write', name: 'Realizar ventas' },
    { resource: 'sales', action: 'void', name: 'Anular ventas' },
    { resource: 'cash', action: 'read', name: 'Ver caja' },
    { resource: 'cash', action: 'write', name: 'Apertura/cierre de caja' },
    { resource: 'customers', action: 'read', name: 'Ver clientes' },
    { resource: 'customers', action: 'write', name: 'Crear/editar clientes' },
    { resource: 'reports', action: 'read', name: 'Ver reportes' },
    { resource: 'settings', action: 'admin', name: 'Configuración del sistema' },
  ];

  const savedPermissions: Permission[] = [];

  for (const perm of permissionsData) {
    let existing = await permissionRepo.findOne({
      where: { resource: perm.resource, action: perm.action },
    });

    if (!existing) {
      existing = permissionRepo.create(perm);
      existing = await permissionRepo.save(existing);
    }

    savedPermissions.push(existing);
  }

  const permMap = new Map<string, Permission>();
  for (const p of savedPermissions) {
    permMap.set(`${p.resource}:${p.action}`, p);
  }

  // ──────────────────────────────────────────────
  // 2. Ensure default tenant exists
  // ──────────────────────────────────────────────

  let defaultTenant = await tenantRepo.findOne({
    where: { slug: 'default' },
  });

  if (!defaultTenant) {
    defaultTenant = tenantRepo.create({
      name: 'Default Tenant',
      slug: 'default',
      settings: {},
      isActive: true,
    });
    defaultTenant = await tenantRepo.save(defaultTenant);
  }

  const tenantId = defaultTenant.id;

  // ──────────────────────────────────────────────
  // 3. Seed Roles + Permission Assignments
  // ──────────────────────────────────────────────

  const roleDefinitions = [
    {
      name: 'Admin',
      description: 'Acceso total al sistema',
      permissions: permissionsData.map((p) => `${p.resource}:${p.action}`),
    },
    {
      name: 'Vendedor',
      description: 'Gestión de ventas y clientes',
      permissions: [
        'sales:read', 'sales:write', 'sales:void',
        'customers:read', 'customers:write',
        'cash:read',
        'products:read',
        'stock:read',
      ],
    },
    {
      name: 'Stock',
      description: 'Gestión de productos e inventario',
      permissions: [
        'products:read', 'products:write', 'products:delete',
        'stock:read', 'stock:write',
      ],
    },
  ];

  for (const def of roleDefinitions) {
    let role = await roleRepo.findOne({
      where: { name: def.name, tenantId },
    });

    if (!role) {
      role = roleRepo.create({
        name: def.name,
        description: def.description,
        tenantId,
      });
      role = await roleRepo.save(role);

      // Assign permissions
      for (const permKey of def.permissions) {
        const perm = permMap.get(permKey);
        if (perm) {
          const rp = rolePermissionRepo.create({
            roleId: role.id,
            permissionId: perm.id,
          });
          await rolePermissionRepo.save(rp);
        }
      }
    }
  }

  // ──────────────────────────────────────────────
  // 4. Seed default admin user
  // ──────────────────────────────────────────────

  const adminEmail = 'admin@example.com';

  let adminUser = await userRepo.findOne({
    where: { email: adminEmail },
    withDeleted: true,
  });

  if (!adminUser) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    adminUser = userRepo.create({
      email: adminEmail,
      passwordHash,
      name: 'Administrador',
      tenantId,
      active: true,
    });
    adminUser = await userRepo.save(adminUser);

    // Assign Admin role
    const adminRole = await roleRepo.findOne({
      where: { name: 'Admin', tenantId },
    });

    if (adminRole) {
      const ur = userRoleRepo.create({
        userId: adminUser.id,
        roleId: adminRole.id,
      });
      await userRoleRepo.save(ur);
    }
  }

  console.log('[Seed] Roles, permissions, and admin user seeded successfully.');
}
