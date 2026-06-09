import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { getDataSourceToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
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
    password_hash: '$2b$10$hashedpassword',
    active: true,
  };

  const mockValidatedUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'admin@store.com',
    name: 'Admin',
    roles: ['Admin'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockManager = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
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

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
    dataSource = module.get(getDataSourceToken());

    // Default mock: transaction invokes callback with mockManager
    dataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));
  });

  // ---------------------------------------------------------------------------
  // validateUser
  // ---------------------------------------------------------------------------
  describe('validateUser', () => {
    it('should return user object when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUserRow);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tenantContext.run.mockImplementation((_ctx: any, cb: () => void) => cb());
      dataSource.query.mockResolvedValue([{ name: 'Admin' }]);

      const result = await authService.validateUser('admin@store.com', 'correct-password');

      expect(usersService.findByEmail).toHaveBeenCalledWith('admin@store.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', mockUserRow.password_hash);
      expect(result).toEqual(mockValidatedUser);
    });

    it('should return null when user is not found by email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await authService.validateUser('unknown@store.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUserRow);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateUser('admin@store.com', 'wrong-password');
      expect(result).toBeNull();
    });

    it('should return null when account is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUserRow, active: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser('admin@store.com', 'correct-password');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  describe('login', () => {
    it('should return access_token + refresh_token + user for a validated user', async () => {
      jwtService.sign.mockReturnValue('fake.jwt.token');
      mockManager.query.mockResolvedValue(undefined); // INSERT succeeds

      const result = await authService.login(mockValidatedUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'admin@store.com',
        tenant_id: 'tenant-1',
        roles: ['Admin'],
      });
      expect(result).toEqual({
        access_token: 'fake.jwt.token',
        refresh_token: expect.any(String),
        user: {
          id: 'user-1',
          email: 'admin@store.com',
          name: 'Admin',
          tenantId: 'tenant-1',
          roles: ['Admin'],
        },
      });
      // Verify the refresh token looks like a UUID (hex with dashes)
      expect(result.refresh_token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getMe
  // ---------------------------------------------------------------------------
  describe('getMe', () => {
    it('should delegate to UsersService.findById and return the profile', async () => {
      const profile = { id: 'user-1', email: 'admin@store.com', name: 'Admin' };
      usersService.findById.mockResolvedValue(profile as any);

      const result = await authService.getMe('user-1');

      expect(usersService.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(profile);
    });
  });

  // ---------------------------------------------------------------------------
  // generateRefreshToken (3.1)
  // ---------------------------------------------------------------------------
  describe('generateRefreshToken', () => {
    it('should insert a token row and return a UUID-shaped raw token', async () => {
      mockManager.query.mockResolvedValue(undefined);

      const rawToken = await authService.generateRefreshToken(mockValidatedUser, 'tenant-1');

      // Returns a raw UUID token
      expect(rawToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // Called inside a transaction with the INSERT query
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.query).toHaveBeenCalledTimes(1);
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([
          expect.any(String), // token_hash (sha256 hex)
          expect.any(String), // family_id (uuid)
          'user-1',
          'tenant-1',
          expect.any(Date),   // expires_at
        ]),
      );

      // Verify that the token_hash is a 64-char hex string (SHA-256)
      const tokenHashArg = mockManager.query.mock.calls[0][1][0];
      expect(tokenHashArg).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different tokens for subsequent calls', async () => {
      mockManager.query.mockResolvedValue(undefined);

      const token1 = await authService.generateRefreshToken(mockValidatedUser, 'tenant-1');
      const token2 = await authService.generateRefreshToken(mockValidatedUser, 'tenant-1');

      expect(token1).not.toBe(token2);
    });
  });

  // ---------------------------------------------------------------------------
  // refresh (3.2, 3.3, 3.4)
  // ---------------------------------------------------------------------------
  describe('refresh', () => {
    const mockTokenRow = {
      id: 'token-1',
      family_id: 'family-1',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      is_used: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // future
    };

    const validRefreshToken = 'some-uuid-refresh-token-value';

    beforeEach(() => {
      // Default: SELECT FOR UPDATE returns a valid, unused token
      mockManager.query.mockResolvedValue([mockTokenRow]);
      // Default: user lookup query returns a user row
      dataSource.query.mockResolvedValue([{ id: 'user-1', email: 'admin@store.com' }]);
      // Default: loadUserRoles works
      tenantContext.run.mockImplementation((_ctx: any, cb: () => void) => cb());
      // Default: jwtService.sign
      jwtService.sign.mockReturnValue('new.jwt.token');
    });

    // 3.2 — Happy path: rotation produces new token in same family
    it('should rotate a valid token and return a new access_token + refresh_token pair', async () => {
      const result = await authService.refresh({ refresh_token: validRefreshToken });

      // The transaction callback ran
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);

      // First call inside txn: SELECT FOR UPDATE
      expect(mockManager.query.mock.calls[0][0]).toContain('SELECT');
      expect(mockManager.query.mock.calls[0][0]).toContain('FOR UPDATE');

      // SET is_used = TRUE
      expect(mockManager.query.mock.calls[1][0]).toContain('UPDATE');
      expect(mockManager.query.mock.calls[1][0]).toContain('is_used');

      // INSERT new token
      expect(mockManager.query.mock.calls[2][0]).toContain('INSERT INTO refresh_tokens');

      // Returns the new tokens
      expect(result).toEqual({
        access_token: 'new.jwt.token',
        refresh_token: expect.any(String),
      });
      expect(result.refresh_token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    // 3.3 — Expired token → 401
    it('should throw 401 when the token is expired', async () => {
      mockManager.query.mockResolvedValue([
        { ...mockTokenRow, expires_at: new Date(Date.now() - 1000) }, // past
      ]);

      await expect(
        authService.refresh({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(UnauthorizedException);
      // Should NOT call UPDATE/INSERT (no rotation)
      expect(mockManager.query).toHaveBeenCalledTimes(1);
    });

    // 3.3 — Invalid token (not found) → 401
    it('should throw 401 when the token does not exist', async () => {
      mockManager.query.mockResolvedValue([]);

      await expect(
        authService.refresh({ refresh_token: 'nonexistent-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // 3.4 — Theft detection: used token → DELETE family → 409
    it('should revoke the entire family and throw 409 when token is already used', async () => {
      mockManager.query.mockResolvedValue([
        { ...mockTokenRow, is_used: true },
      ]);

      await expect(
        authService.refresh({ refresh_token: validRefreshToken }),
      ).rejects.toThrow(ConflictException);

      // Should have called DELETE on the family
      const deleteCall = mockManager.query.mock.calls.find(
        (call: any) => call[0].includes('DELETE'),
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall[1]).toEqual(['family-1']);
    });
  });
});
