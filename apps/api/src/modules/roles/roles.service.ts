import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { UserRole } from '../../entities/user-role.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { PermissionCacheService } from '../../common/cache/permission-cache.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly tenantContext: TenantContextService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  /**
   * List all roles in the current tenant, with their permissions eagerly loaded.
   */
  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { tenantId: this.tenantContext.getTenantId()! },
      relations: {
        rolePermissions: {
          permission: true,
        },
      },
      order: { name: 'ASC' },
    });
  }

  /**
   * Find a single role by ID within the current tenant.
   */
  async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id, tenantId: this.tenantContext.getTenantId()! },
      relations: {
        rolePermissions: {
          permission: true,
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  /**
   * Create a new role scoped to the current tenant.
   * Optionally assigns initial permissions.
   */
  async create(dto: CreateRoleDto): Promise<Role> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      tenantId,
    });

    const savedRole = await this.roleRepository.save(role);

    // Assign permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      const rolePermissions = dto.permissionIds.map((permissionId) =>
        this.rolePermissionRepository.create({
          roleId: savedRole.id,
          permissionId,
        }),
      );
      await this.rolePermissionRepository.save(rolePermissions);
    }

    return this.findById(savedRole.id);
  }

  /**
   * Update role name, description, and/or assigned permissions.
   * If permissionIds is provided, it REPLACES the entire permission set.
   */
  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);

    if (dto.name !== undefined) {
      role.name = dto.name;
    }
    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    await this.roleRepository.save(role);

    // Replace permission set if provided
    if (dto.permissionIds !== undefined) {
      await this.rolePermissionRepository.delete({ roleId: id });

      if (dto.permissionIds.length > 0) {
        const rolePermissions = dto.permissionIds.map((permissionId) =>
          this.rolePermissionRepository.create({
            roleId: id,
            permissionId,
          }),
        );
        await this.rolePermissionRepository.save(rolePermissions);
      }

      // Invalidate cache for all users with this role
      await this.invalidateCacheForRole(id);
    }

    return this.findById(id);
  }

  /**
   * Delete a role. Blocks deletion if any users are currently assigned to it.
   */
  async delete(id: string): Promise<void> {
    const role = await this.findById(id);

    // Check for active user assignments
    const assignmentCount = await this.userRoleRepository.count({
      where: { roleId: id },
    });

    if (assignmentCount > 0) {
      throw new ConflictException(
        `Role "${role.name}" has ${assignmentCount} active user assignment(s). Remove all assignments before deleting.`,
      );
    }

    await this.roleRepository.remove(role);
  }

  /**
   * Invalidate permission cache entries for all users assigned to a role.
   */
  private async invalidateCacheForRole(roleId: string): Promise<void> {
    const assignments = await this.userRoleRepository.find({
      where: { roleId },
    });

    const tenantId = this.tenantContext.getTenantId()!;
    for (const assignment of assignments) {
      this.cacheService.invalidate(assignment.userId, tenantId);
    }
  }
}
