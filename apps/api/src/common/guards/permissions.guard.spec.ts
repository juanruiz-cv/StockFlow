import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '../../entities/user-role.entity';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { PermissionCacheService } from '../cache/permission-cache.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let userRoleRepo: jest.Mocked<Pick<import('typeorm').Repository<UserRole>, 'find'>>;
  let cacheService: jest.Mocked<PermissionCacheService>;

  /**
   * Build a minimal ExecutionContext with the given request.user and handler metadata.
   */
  function mockContext(options: {
    user?: Record<string, any> | null;
    permissions?: string[];
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: options.user }),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: { find: jest.fn() },
        },
        {
          provide: PermissionCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    cacheService = module.get(PermissionCacheService) as jest.Mocked<PermissionCacheService>;
  });

  // ---------------------------------------------------------------------------
  // canActivate
  // ---------------------------------------------------------------------------
  describe('canActivate', () => {
    const authenticatedUser = {
      sub: 'user-1',
      tenant_id: 'tenant-1',
      email: 'admin@store.com',
      roles: ['Admin'],
    };

    it('should allow when user has the required permission (from cache)', async () => {
      reflector.getAllAndOverride.mockReturnValue(['users:read']);
      cacheService.get.mockReturnValue(['users:read', 'users:write']);

      const result = await guard.canActivate(mockContext({ user: authenticatedUser }));

      expect(result).toBe(true);
      expect(userRoleRepo.find).not.toHaveBeenCalled(); // served from cache
    });

    it('should allow when user has the required permission (from DB, cache miss)', async () => {
      reflector.getAllAndOverride.mockReturnValue(['users:read']);
      cacheService.get.mockReturnValue(null); // cache miss
      userRoleRepo.find.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: { resource: 'users', action: 'read' },
              },
              {
                permission: { resource: 'users', action: 'write' },
              },
            ],
          },
        },
      ] as any[]);

      const result = await guard.canActivate(mockContext({ user: authenticatedUser }));

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalled();
      expect(userRoleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('should deny (throw 403) when user lacks the required permission', async () => {
      reflector.getAllAndOverride.mockReturnValue(['users:delete']);
      cacheService.get.mockReturnValue(['users:read']);

      await expect(
        guard.canActivate(mockContext({ user: authenticatedUser })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow when no permissions are required (null metadata)', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext({ user: authenticatedUser }));

      expect(result).toBe(true);
      expect(userRoleRepo.find).not.toHaveBeenCalled();
    });

    it('should allow when required permissions list is empty', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = await guard.canActivate(mockContext({ user: authenticatedUser }));

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when there is no authenticated user on request', async () => {
      reflector.getAllAndOverride.mockReturnValue(['users:read']);

      await expect(
        guard.canActivate(mockContext({ user: null })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use cache on repeated calls with the same user', async () => {
      reflector.getAllAndOverride.mockReturnValue(['users:read']);
      cacheService.get
        .mockReturnValueOnce(null)   // first call: cache miss
        .mockReturnValueOnce(['users:read']); // second call: cache hit
      userRoleRepo.find.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              { permission: { resource: 'users', action: 'read' } },
            ],
          },
        },
      ] as any[]);

      // First call — hits DB, populates cache
      await guard.canActivate(mockContext({ user: authenticatedUser }));
      expect(userRoleRepo.find).toHaveBeenCalledTimes(1);
      expect(cacheService.set).toHaveBeenCalledWith('tenant-1:user-1', ['users:read']);

      // Second call — served from cache
      await guard.canActivate(mockContext({ user: authenticatedUser }));
      expect(userRoleRepo.find).toHaveBeenCalledTimes(1); // still only 1 DB call
    });
  });
});
