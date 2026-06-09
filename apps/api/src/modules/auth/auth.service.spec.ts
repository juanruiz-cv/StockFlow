import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
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
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
    dataSource = module.get(getDataSourceToken());
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
    it('should return access_token with valid JWT for a validated user', async () => {
      jwtService.sign.mockReturnValue('fake.jwt.token');

      const result = await authService.login(mockValidatedUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'admin@store.com',
        tenant_id: 'tenant-1',
        roles: ['Admin'],
      });
      expect(result).toEqual({
        access_token: 'fake.jwt.token',
        user: {
          id: 'user-1',
          email: 'admin@store.com',
          name: 'Admin',
          tenantId: 'tenant-1',
          roles: ['Admin'],
        },
      });
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
});
