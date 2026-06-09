import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TenantContextService } from '../../common/tenants/tenant-context.service';

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
   * Sign a JWT for an authenticated user.
   * The payload includes sub, email, tenant_id, and roles claims.
   */
  async login(user: any): Promise<{ access_token: string; user: any }> {
    const payload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenantId,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
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
