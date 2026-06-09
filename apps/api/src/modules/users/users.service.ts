import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { PermissionCacheService } from '../../common/cache/permission-cache.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    private readonly cacheService: PermissionCacheService,
  ) {}

  /**
   * Create a new user within the current tenant.
   *
   * - Checks for duplicate email within the tenant (409 on conflict)
   * - Hashes password with bcrypt (cost factor 10)
   * - Assigns tenantId from the current ALS tenant context
   */
  async create(dto: CreateUserDto): Promise<User> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }

    // Check for duplicate email within tenant
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      tenantId,
      active: dto.active ?? true,
    });

    return this.userRepository.save(user);
  }

  /**
   * List all non-deleted users in the current tenant.
   * RLS automatically scopes results to the tenant.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a user by ID within the current tenant.
   * Soft-deleted users are excluded.
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Update user fields. TenantId cannot be changed.
   * Checks email uniqueness on email change.
   */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists in this tenant');
      }
      user.email = dto.email;
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.active !== undefined) {
      user.active = dto.active;
    }

    return this.userRepository.save(user);
  }

  /**
   * Soft-delete a user by setting the `deleted_at` timestamp.
   * The user is not physically removed from the database.
   */
  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    user.deletedAt = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Assign a role to a user within the current tenant.
   * Validates both user and role exist in the tenant before creating the association.
   * Invalidates the permission cache for the user after assignment.
   */
  async assignRole(userId: string, roleId: string): Promise<{ message: string }> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }

    // Verify user exists in tenant
    await this.findById(userId);

    // Verify role exists in tenant
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenantId },
    });
    if (!role) {
      throw new NotFoundException('Role not found in this tenant');
    }

    // Check if assignment already exists
    const existing = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });
    if (existing) {
      throw new BadRequestException('User already has this role assigned');
    }

    const userRole = this.userRoleRepository.create({ userId, roleId });
    await this.userRoleRepository.save(userRole);

    // Invalidate permission cache so the guard picks up the new role
    this.cacheService.invalidate(userId, tenantId);

    return { message: `Role "${role.name}" assigned successfully` };
  }

  /**
   * Remove a role from a user within the current tenant.
   * Invalidates the permission cache for the user after removal.
   */
  async removeRole(userId: string, roleId: string): Promise<{ message: string }> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }

    // Verify user exists
    await this.findById(userId);

    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
      relations: { role: true },
    });
    if (!userRole) {
      throw new NotFoundException('Role assignment not found');
    }

    const roleName = userRole.role?.name ?? 'Unknown';
    await this.userRoleRepository.remove(userRole);

    // Invalidate permission cache
    this.cacheService.invalidate(userId, tenantId);

    return { message: `Role "${roleName}" removed successfully` };
  }

  /**
   * Find a user by email globally (bypasses RLS via raw query).
   * Used internally by AuthService for the login flow.
   */
  async findByEmail(email: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT id, tenant_id, email, password_hash, name, active
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );

    if (result.length === 0) return null;

    return result[0];
  }
}
