import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContextService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate email/password credentials.
   *
   * Returns the user object (without password) on success, or null on failure.
   * Uses UsersService.findByEmail which uses a raw query to bypass RLS
   * since the tenant context is not yet established at login time.
   */
  async validateUser(email: string, password: string): Promise<any> {
    const userRow = await this.usersService.findByEmail(email);

    if (!userRow) {
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    // Check account status
    if (!userRow.active) {
      return null;
    }

    // Load roles within the user's tenant context
    const roles = await this.loadUserRoles(userRow.id, userRow.tenant_id);

    return {
      id: userRow.id,
      tenantId: userRow.tenant_id,
      email: userRow.email,
      name: userRow.name,
      roles,
    };
  }

  /**
   * Sign a JWT for an authenticated user and generate a refresh token.
   * The payload includes sub, email, tenant_id, and roles claims.
   * The response includes a refresh_token for the rotation flow.
   */
  async login(user: any): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenantId,
      roles: user.roles,
    };

    const refreshToken = await this.generateRefreshToken(user, user.tenantId);

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles,
      },
    };
  }

  /**
   * Return the full profile of the currently authenticated user.
   * Fetches fresh data from the DB using the UsersService.
   */
  async getMe(userId: string): Promise<any> {
    return this.usersService.findById(userId);
  }

  /**
   * Generate a new refresh token for the given user.
   *
   * Creates a raw UUID token, hashes it with SHA-256, and stores the hash
   * in a new refresh_tokens row with a unique family_id. Returns the raw
   * UUID token to the caller (the client receives this; only the hash
   * is persisted).
   */
  async generateRefreshToken(user: any, tenantId: string): Promise<string> {
    const rawToken = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO refresh_tokens (token_hash, family_id, user_id, tenant_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [tokenHash, familyId, user.id, tenantId, expiresAt],
      );
    });

    return rawToken;
  }

  /**
   * Refresh an access token using a valid refresh token.
   *
   * Flow:
   * 1. SHA-256 hash the incoming refresh_token
   * 2. SELECT FOR UPDATE to serialize concurrent requests
   * 3. Reject if token not found (401) or expired (401)
   * 4. Theft detection: if is_used=true → DELETE family → 409 Conflict
   * 5. Rotation: mark old is_used=true, insert new token in same family
   * 6. Sign a new access token and return it with the new refresh token
   */
  async refresh(dto: RefreshDto): Promise<{ access_token: string; refresh_token: string }> {
    const tokenHash = crypto.createHash('sha256').update(dto.refresh_token).digest('hex');

    let userId: string = '';
    let tenantId: string = '';
    let newRawToken: string = '';

    await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT id, family_id, user_id, tenant_id, is_used, expires_at
         FROM refresh_tokens
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash],
      );

      if (rows.length === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const token = rows[0];
      userId = token.user_id;
      tenantId = token.tenant_id;

      // Expiry check first — do NOT trigger theft detection for expired tokens
      if (new Date(token.expires_at) < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Theft detection: token already used → revoke entire family
      if (token.is_used) {
        await manager.query(
          `DELETE FROM refresh_tokens WHERE family_id = $1`,
          [token.family_id],
        );
        throw new ConflictException('Refresh token reused — family revoked');
      }

      // Rotation: mark current token as used
      await manager.query(
        `UPDATE refresh_tokens SET is_used = TRUE WHERE id = $1`,
        [token.id],
      );

      // Insert new token in the same family
      newRawToken = crypto.randomUUID();
      const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await manager.query(
        `INSERT INTO refresh_tokens (token_hash, family_id, user_id, tenant_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [newTokenHash, token.family_id, userId, tenantId, expiresAt],
      );
    });

    // After successful rotation, issue a new access token
    const accessToken = await this.signRefreshAccessToken(userId, tenantId);

    return {
      access_token: accessToken,
      refresh_token: newRawToken,
    };
  }

  /**
   * Sign a new access token for a user during the refresh flow.
   *
   * Loads the user's email (bypassing RLS with a raw query) and their
   * roles within their tenant context, then signs a fresh JWT.
   */
  private async signRefreshAccessToken(userId: string, tenantId: string): Promise<string> {
    const userRows = await this.dataSource.query(
      `SELECT id, email FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    const email = userRows.length > 0 ? userRows[0].email : '';
    const roles = await this.loadUserRoles(userId, tenantId);

    const payload = { sub: userId, email, tenant_id: tenantId, roles };
    return this.jwtService.sign(payload);
  }

  /**
   * Load role names for a user within their tenant context.
   *
   * We temporarily set the tenant context in AsyncLocalStorage so that
   * the RLS subscriber correctly scopes the role and user_roles queries.
   */
  private loadUserRoles(userId: string, tenantId: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.tenantContext.run(
        { tenantId, userId, email: '', roles: [] },
        async () => {
          try {
            const result = await this.dataSource.query(
              `SELECT r.name
               FROM roles r
               JOIN user_roles ur ON ur.role_id = r.id
               WHERE ur.user_id = $1`,
              [userId],
            );
            resolve(result.map((r: any) => r.name));
          } catch (error) {
            reject(error);
          }
        },
      );
    });
  }
}
