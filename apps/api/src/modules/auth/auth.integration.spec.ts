import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, ForbiddenException, ExecutionContext } from '@nestjs/common';
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
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let mockManager: { query: jest.Mock };

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

    mockManager = { query: jest.fn() };

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
          useValue: {
            query: jest.fn(),
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = moduleRef.get(JwtService) as jest.Mocked<JwtService>;
    tenantContext = moduleRef.get(TenantContextService) as jest.Mocked<TenantContextService>;
    dataSource = moduleRef.get(getDataSourceToken());

    // Default mock: transaction invokes callback with mockManager
    dataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));
  });

  // ---------------------------------------------------------------------------
  // 6.5  Integration test: login flow
  // ---------------------------------------------------------------------------
  describe('6.5 POST /auth/login — login flow', () => {
    const loginCreds = { email: 'admin@store.com', password: 'correct-pw' };

    it('should return { access_token, refresh_token, user } for valid credentials (200 equivalent)', async () => {
      usersService.findByEmail.mockResolvedValue(mockUserRow);
      bcrypt.compare.mockResolvedValue(true);
      tenantContext.run.mockImplementation((_ctx: any, cb: Function) => cb());
      dataSource.query.mockResolvedValue([{ name: 'Admin' }]);
      jwtService.sign.mockReturnValue('int.token');
      mockManager.query.mockResolvedValue(undefined); // INSERT succeeds

      const result = await authController.login(loginCreds);

      expect(result).toHaveProperty('access_token', 'int.token');
      expect(result).toHaveProperty('refresh_token');
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
  // 3.5  Integration test: POST /auth/refresh flow
  // ---------------------------------------------------------------------------
  describe('3.5 POST /auth/refresh — refresh flow', () => {
    const validRefreshToken = 'some-uuid-refresh-token';

    const mockTokenRow = {
      id: 'token-1',
      family_id: 'family-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      is_used: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    it('should return { access_token, refresh_token } for a valid refresh token', async () => {
      // SELECT FOR UPDATE returns a valid unused token
      mockManager.query.mockResolvedValue([mockTokenRow]);
      // User lookup for JWT signing
      dataSource.query.mockResolvedValue([{ id: 'user-1', email: 'admin@store.com' }]);
      // Load roles
      tenantContext.run.mockImplementation((_ctx: any, cb: Function) => cb());
      jwtService.sign.mockReturnValue('new.int.token');

      const result = await authController.refresh({ refresh_token: validRefreshToken });

      expect(result).toHaveProperty('access_token', 'new.int.token');
      expect(result).toHaveProperty('refresh_token');
      expect(typeof result.refresh_token).toBe('string');
    });

    it('should throw 401 when refresh token is expired', async () => {
      mockManager.query.mockResolvedValue([
        { ...mockTokenRow, expires_at: new Date(Date.now() - 1000) },
      ]);

      await expect(
        authController.refresh({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when refresh token does not exist', async () => {
      mockManager.query.mockResolvedValue([]);

      await expect(
        authController.refresh({ refresh_token: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 409 when refresh token was already used (theft detection)', async () => {
      mockManager.query.mockResolvedValue([
        { ...mockTokenRow, is_used: true },
      ]);

      await expect(
        authController.refresh({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(ConflictException);
    });

    // Rotation chain: first refresh works, but reusing the stale token fails with 409
    it('should allow rotation chain — first refresh succeeds, stale reuse fails', async () => {
      // Step 1: first refresh succeeds with a clean token
      mockManager.query.mockResolvedValue([mockTokenRow]);
      dataSource.query.mockResolvedValue([{ id: 'user-1', email: 'admin@store.com' }]);
      tenantContext.run.mockImplementation((_ctx: any, cb: Function) => cb());
      jwtService.sign.mockReturnValue('new.int.token');

      const firstResult = await authController.refresh({ refresh_token: validRefreshToken });
      expect(firstResult).toHaveProperty('access_token', 'new.int.token');
      expect(firstResult).toHaveProperty('refresh_token');

      // Step 2: reusing the SAME refresh token should trigger theft detection
      // Change the mock to simulate that the token is now marked is_used=true
      mockManager.query.mockResolvedValue([
        { ...mockTokenRow, is_used: true },
      ]);

      await expect(
        authController.refresh({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(ConflictException);
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
