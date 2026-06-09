import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TenantContextService } from '../../common/tenants/tenant-context.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
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
      where: { deletedAt: null },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a user by ID within the current tenant.
   * Soft-deleted users are excluded.
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: null },
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
