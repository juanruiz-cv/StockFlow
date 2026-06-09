import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { UserRole } from '../../entities/user-role.entity';
import { PermissionCacheService } from '../cache/permission-cache.service';

/**
 * Guard that checks the authenticated user has at least one of the required
 * permissions set via @RequirePermission().
 *
 * Permissions are resolved from the user's roles and cached in memory with
 * a 30-second TTL to avoid DB lookups on every request.
 *
 * Must be used AFTER JwtAuthGuard so that request.user is populated.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermission('users:write')
 * @Post()
 * create(@Body() dto: CreateUserDto) { ... }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly cacheService: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required → allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const tenantId: string = user.tenant_id;
    const userId: string = user.sub;
    const cacheKey = `${tenantId}:${userId}`;

    // Check cache first
    let userPermissions = this.cacheService.get(cacheKey);

    if (!userPermissions) {
      // Resolve from DB: find user's roles with their permissions
      const userRoles = await this.userRoleRepository.find({
        where: { userId },
        relations: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      });

      // Flatten to permission strings (resource:action)
      const permissionSet = new Set<string>();
      for (const ur of userRoles) {
        if (ur.role?.rolePermissions) {
          for (const rp of ur.role.rolePermissions) {
            if (rp.permission) {
              permissionSet.add(`${rp.permission.resource}:${rp.permission.action}`);
            }
          }
        }
      }

      userPermissions = Array.from(permissionSet);

      // Cache with 30s TTL
      this.cacheService.set(cacheKey, userPermissions);
    }

    // Check if user has at least one of the required permissions (OR logic)
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions!.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
