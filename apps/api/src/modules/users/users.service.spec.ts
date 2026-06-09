import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { PermissionCacheService } from '../../common/cache/permission-cache.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Pick<import('typeorm').Repository<User>, 'find' | 'findOne' | 'create' | 'save'>>;
  let roleRepo: jest.Mocked<Pick<import('typeorm').Repository<Role>, 'findOne'>>;
  let userRoleRepo: jest.Mocked<Pick<import('typeorm').Repository<UserRole>, 'find' | 'findOne' | 'create' | 'save' | 'remove'>>;
  let dataSource: { query: jest.Mock };
  let tenantContext: jest.Mocked<TenantContextService>;
  let cacheService: jest.Mocked<PermissionCacheService>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@store.com',
    name: 'Test User',
    passwordHash: '$2b$10$hashed',
    active: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: { query: jest.fn() },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn(),
            getCurrentContext: jest.fn(),
            getUserId: jest.fn(),
            run: jest.fn(),
          },
        },
        {
          provide: PermissionCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidate: jest.fn(),
            invalidateAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    dataSource = module.get(getDataSourceToken());
    tenantContext = module.get(TenantContextService);
    cacheService = module.get(PermissionCacheService);
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'new@store.com',
      password: 'password123',
      name: 'New User',
    };

    it('should create a user with hashed password and tenantId', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(null); // no duplicate
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$mockedhash');
      userRepo.create.mockReturnValue(mockUser as User);
      userRepo.save.mockResolvedValue(mockUser as User);

      const result = await service.create(dto);

      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(userRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: dto.email }, withDeleted: true }),
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          name: dto.name,
          tenantId: 'tenant-1',
        }),
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException on duplicate email in same tenant', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(mockUser as User); // duplicate found

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant context is not available', async () => {
      tenantContext.getTenantId.mockReturnValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return only non-deleted users ordered by creation date desc', async () => {
      const users = [mockUser as User, { ...mockUser, id: 'user-2', email: 'user2@store.com' } as User];
      userRepo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(userRepo.find).toHaveBeenCalledWith({
        where: { deletedAt: expect.any(Object) },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(users);
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should return user when found and not deleted', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findById('user-1');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: expect.any(Object) },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for a soft-deleted user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('user-soft-deleted')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should update user name', async () => {
      const dto: UpdateUserDto = { name: 'Updated Name' };
      userRepo.findOne.mockResolvedValue(mockUser as User);
      userRepo.save.mockResolvedValue({ ...mockUser, name: 'Updated Name' } as User);

      const result = await service.update('user-1', dto);

      expect(userRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1', deletedAt: expect.any(Object) } }),
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should update email and check uniqueness', async () => {
      const dto: UpdateUserDto = { email: 'new-email@store.com' };
      userRepo.findOne
        .mockResolvedValueOnce(mockUser as User)  // findById
        .mockResolvedValueOnce(null);              // no duplicate on email check
      userRepo.save.mockResolvedValue({ ...mockUser, email: 'new-email@store.com' } as User);

      const result = await service.update('user-1', dto);

      expect(result.email).toBe('new-email@store.com');
    });

    it('should throw ConflictException when new email is taken by another user', async () => {
      const dto: UpdateUserDto = { email: 'taken@store.com' };
      const otherUser = { ...mockUser, id: 'user-2', email: 'taken@store.com' };
      userRepo.findOne
        .mockResolvedValueOnce(mockUser as User)  // findById
        .mockResolvedValueOnce(otherUser as User); // existing with same email

      await expect(service.update('user-1', dto)).rejects.toThrow(ConflictException);
    });
  });

  // ---------------------------------------------------------------------------
  // softDelete
  // ---------------------------------------------------------------------------
  describe('softDelete', () => {
    it('should set deletedAt timestamp on the user', async () => {
      const user = { ...mockUser, deletedAt: null } as User;
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockImplementation(async (u: any) => ({ ...u, deletedAt: new Date() }));

      await service.softDelete('user-1');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // findByEmail
  // ---------------------------------------------------------------------------
  describe('findByEmail', () => {
    it('should return raw user row from direct SQL', async () => {
      const row = { id: 'user-1', tenant_id: 'tenant-1', email: 'test@store.com', password_hash: '$2b$10$h' };
      dataSource.query.mockResolvedValue([row]);

      const result = await service.findByEmail('test@store.com');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test@store.com'],
      );
      expect(result).toEqual(row);
    });

    it('should return null when email is not found', async () => {
      dataSource.query.mockResolvedValue([]);

      const result = await service.findByEmail('unknown@store.com');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // assignRole
  // ---------------------------------------------------------------------------
  describe('assignRole', () => {
    const adminRole = { id: 'role-1', name: 'Admin', tenantId: 'tenant-1' };

    it('should assign role and invalidate permission cache', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(mockUser as User);
      roleRepo.findOne.mockResolvedValue(adminRole as Role);
      userRoleRepo.findOne.mockResolvedValue(null); // no existing assignment
      userRoleRepo.create.mockReturnValue({ userId: 'user-1', roleId: 'role-1' } as UserRole);
      userRoleRepo.save.mockResolvedValue({ userId: 'user-1', roleId: 'role-1' } as UserRole);

      const result = await service.assignRole('user-1', 'role-1');

      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'role-1', tenantId: 'tenant-1' },
      });
      expect(cacheService.invalidate).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual({ message: expect.stringContaining('Admin') });
    });

    it('should throw BadRequestException if role already assigned', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(mockUser as User);
      roleRepo.findOne.mockResolvedValue(adminRole as Role);
      userRoleRepo.findOne.mockResolvedValue({ userId: 'user-1', roleId: 'role-1' } as UserRole); // already assigned

      await expect(service.assignRole('user-1', 'role-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when role does not exist in tenant', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(mockUser as User);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.assignRole('user-1', 'role-nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // removeRole
  // ---------------------------------------------------------------------------
  describe('removeRole', () => {
    it('should remove role and invalidate permission cache', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(mockUser as User);
      const userRole = { userId: 'user-1', roleId: 'role-1', role: { name: 'Admin' } } as UserRole;
      userRoleRepo.findOne.mockResolvedValue(userRole);
      userRoleRepo.remove.mockResolvedValue(userRole);

      const result = await service.removeRole('user-1', 'role-1');

      expect(cacheService.invalidate).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual({ message: expect.stringContaining('Admin') });
    });

    it('should throw NotFoundException when assignment not found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      userRepo.findOne.mockResolvedValue(mockUser as User);
      userRoleRepo.findOne.mockResolvedValue(null);

      await expect(service.removeRole('user-1', 'role-1')).rejects.toThrow(NotFoundException);
    });
  });
});
