import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { UserRole } from '../../entities/user-role.entity';
import { PermissionCacheService } from '../../common/cache/permission-cache.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

jest.mock('bcrypt');
const bcrypt = require('bcrypt');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mockExecutionContext(user: Record<string, any> | null): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    switchToRpc: () => ({ getContext: () => ({}), getData: () => null }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => null }),
    getHandler: () => ({} as any),
    getClass: () => ({} as any),
    getArgs: () => [],
    getArgByIndex: () => null,
    getType: () => 'http' as any,
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Helpers for PermissionsGuard tests (6.7)
// ---------------------------------------------------------------------------
function createPermissionsGuard(overrides?: {
  reflectorGet?: ReturnType<typeof jest.fn>;
  cacheGet?: ReturnType<typeof jest.fn>;
  cacheSet?: ReturnType<typeof jest.fn>;
  repoFind?: ReturnType<typeof jest.fn>;
}): PermissionsGuard {
  const reflector = {
    getAllAndOverride: overrides?.reflectorGet ?? jest.fn(),
  } as unknown as Reflector;

  const userRoleRepo = {
    find: overrides?.repoFind ?? jest.fn(),
  } as unknown as ReturnType<typeof jest.fn>;

  const cacheService = {
    get: overrides?.cacheGet ?? jest.fn(),
    set: overrides?.cacheSet ?? jest.fn(),
  } as unknown as PermissionCacheService;

  return new PermissionsGuard(reflector, userRoleRepo as any, cacheService);
}

// ---------------------------------------------------------------------------
// Integration test suite
// ---------------------------------------------------------------------------
describe('Auth Integration (controller → service → mock deps)', () => {
  let authController: AuthController;
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let dataSource: { query: jest.Mock };

  const mockUserRow = {
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'admin@store.com',
    name: 'Admin',
    password_hash: '$2b$10$hash',
    active: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn(), findById: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: TenantContextService,
          useValue: {
            run: jest.fn(),
            getTenantId: jest.fn(),
            getCurrentContext: jest.fn(),
            getUserId: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = moduleRef.get(JwtService) as jest.Mocked<JwtService>;
    tenantContext = moduleRef.get(TenantContextService) as jest.Mocked<TenantContextService>;
    dataSource = moduleRef.get(getDataSourceToken());
  });

  // ---------------------------------------------------------------------------
  // 6.5  Integration test: login flow
  // ---------------------------------------------------------------------------
  describe('6.5 POST /auth/login — login flow', () => {
    const loginCreds = { email: 'admin@store.com', password: 'correct-pw' };

    it('should return { access_token, user } for valid credentials (200 equivalent)', async () => {
      usersService.findByEmail.mockResolvedValue(mockUserRow);
      bcrypt.compare.mockResolvedValue(true);
      tenantContext.run.mockImplementation((_ctx: any, cb: Function) => cb());
      dataSource.query.mockResolvedValue([{ name: 'Admin' }]);
      jwtService.sign.mockReturnValue('int.token');

      const result = await authController.login(loginCreds);

      expect(result).toHaveProperty('access_token', 'int.token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        email: 'admin@store.com',
        tenantId: 'tenant-1',
      });
    });

    it('should throw 401 for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUserRow);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authController.login(loginCreds)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 for non-existent email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authController.login(loginCreds)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 for inactive (deactivated) account', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUserRow, active: false });
      bcrypt.compare.mockResolvedValue(true);

      await expect(authController.login(loginCreds)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6.7  Integration test: PermissionsGuard — 403 on missing permission
  // ---------------------------------------------------------------------------
  describe('6.7 PermissionsGuard — 403 on missing @RequirePermission', () => {
    it('should throw ForbiddenException (403) when user lacks the required permission', async () => {
      const guard = createPermissionsGuard({
        reflectorGet: jest.fn().mockReturnValue(['users:delete']),
        cacheGet: jest.fn().mockReturnValue(['users:read']), // user only has read
      });

      await expect(
        guard.canActivate(
          mockExecutionContext({
            sub: 'user-1',
            tenant_id: 'tenant-1',
            roles: ['Stock'],
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow when user has the required permission', async () => {
      const guard = createPermissionsGuard({
        reflectorGet: jest.fn().mockReturnValue(['users:read']),
        cacheGet: jest.fn().mockReturnValue(['users:read']),
      });

      const result = await guard.canActivate(
        mockExecutionContext({
          sub: 'user-1',
          tenant_id: 'tenant-1',
          roles: ['Admin'],
        }),
      );

      expect(result).toBe(true);
    });

    it('should throw 403 when no user is authenticated on the request', async () => {
      const guard = createPermissionsGuard({
        reflectorGet: jest.fn().mockReturnValue(['users:read']),
      });

      await expect(
        guard.canActivate(mockExecutionContext(null)),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
