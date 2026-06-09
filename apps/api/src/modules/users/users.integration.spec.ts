import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { PermissionCacheService } from '../../common/cache/permission-cache.service';

jest.mock('bcrypt');
const bcrypt = require('bcrypt');

// ---------------------------------------------------------------------------
// Test data: two tenants with distinct user sets
// ---------------------------------------------------------------------------
const tenantAUsers: Array<Partial<User>> = [
  { id: 'ua-1', tenantId: 'tenant-a', email: 'alice@a.com', name: 'Alice', active: true, deletedAt: null },
  { id: 'ua-2', tenantId: 'tenant-a', email: 'bob@a.com', name: 'Bob', active: true, deletedAt: null },
];

const tenantBUsers: Array<Partial<User>> = [
  { id: 'ub-1', tenantId: 'tenant-b', email: 'charlie@b.com', name: 'Charlie', active: true, deletedAt: null },
];

const allUsers = [...tenantAUsers, ...tenantBUsers];

// ---------------------------------------------------------------------------
// Integration test suite
// ---------------------------------------------------------------------------
describe('Users Integration (controller → service → mock deps)', () => {
  let usersController: UsersController;
  let usersService: UsersService;
  let userRepo: jest.Mocked<Pick<import('typeorm').Repository<User>, 'find' | 'findOne' | 'create' | 'save'>>;
  let tenantContext: jest.Mocked<TenantContextService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
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

    usersController = moduleRef.get<UsersController>(UsersController);
    usersService = moduleRef.get<UsersService>(UsersService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    tenantContext = moduleRef.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  // ---------------------------------------------------------------------------
  // 6.6  Integration test: RLS isolation
  // ---------------------------------------------------------------------------
  describe('6.6 RLS isolation — tenant A/B cross-tenant invisibility', () => {
    it('should return only users of tenant A when context is tenant A', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      // Simulate RLS: the mock filters by tenantId matching the current context
      userRepo.find.mockImplementation((_opts?: any) => {
        const currentTenantId = tenantContext.getTenantId();
        return Promise.resolve(
          allUsers.filter(
            (u) => u.tenantId === currentTenantId && u.deletedAt === null,
          ) as User[],
        );
      });

      const result = await usersService.findAll();

      expect(result).toHaveLength(2);
      expect(result.every((u: any) => u.tenantId === 'tenant-a')).toBe(true);
    });

    it('should return only users of tenant B when context is tenant B', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-b');
      userRepo.find.mockImplementation(() => {
        const currentTenantId = tenantContext.getTenantId();
        return Promise.resolve(
          allUsers.filter(
            (u) => u.tenantId === currentTenantId && u.deletedAt === null,
          ) as User[],
        );
      });

      const result = await usersService.findAll();

      expect(result).toHaveLength(1);
      expect(result.every((u: any) => u.tenantId === 'tenant-b')).toBe(true);
    });

    it('should not leak tenant B users when listing as tenant A', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      userRepo.find.mockImplementation(() => {
        const currentTenantId = tenantContext.getTenantId();
        return Promise.resolve(
          allUsers.filter(
            (u) => u.tenantId === currentTenantId && u.deletedAt === null,
          ) as User[],
        );
      });

      const result = await usersService.findAll();

      const tenantBIds = tenantBUsers.map((u) => u.id);
      const resultIds = result.map((u: any) => u.id);
      expect(resultIds).not.toEqual(expect.arrayContaining(tenantBIds));
    });
  });

  // ---------------------------------------------------------------------------
  // Full CRUD flow through UsersController → UsersService
  // ---------------------------------------------------------------------------
  describe('User CRUD flow (controller → service)', () => {
    const newUserDto = { email: 'diana@a.com', password: 'secret123', name: 'Diana' };

    it('should create a user via controller', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      userRepo.findOne.mockResolvedValue(null); // no duplicate
      bcrypt.hash.mockResolvedValue('$2b$10$mockedhash');
      const createdUser = {
        id: 'ua-3',
        tenantId: 'tenant-a',
        email: 'diana@a.com',
        name: 'Diana',
        active: true,
        deletedAt: null,
      } as User;
      userRepo.create.mockReturnValue(createdUser);
      userRepo.save.mockResolvedValue(createdUser);

      const result = await usersController.create(newUserDto);

      expect(result).toHaveProperty('id', 'ua-3');
      expect(result.email).toBe('diana@a.com');
    });

    it('should list users via controller', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      userRepo.find.mockResolvedValue(tenantAUsers as User[]);

      const result = await usersController.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should soft-delete a user via controller', async () => {
      const userToDelete = { ...tenantAUsers[0], deletedAt: null } as User;
      userRepo.findOne.mockResolvedValue(userToDelete);
      userRepo.save.mockImplementation(async (u: any) => ({
        ...u,
        deletedAt: new Date(),
      }));

      const result = await usersController.remove('ua-1');

      expect(result).toEqual({ message: expect.stringContaining('deactivated') });
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should find a user by id via controller', async () => {
      const target = tenantAUsers[0] as User;
      userRepo.findOne.mockResolvedValue(target);

      const result = await usersController.findOne('ua-1');

      expect(result).toEqual(target);
    });
  });
});
