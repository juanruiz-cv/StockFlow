import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by PermissionsGuard to read required permissions.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator that sets required permissions on a route handler.
 *
 * Usage:
 * ```typescript
 * @RequirePermission('users:write')
 * @Post()
 * create(@Body() dto: CreateUserDto) { ... }
 * ```
 *
 * Multiple permissions are OR'd — if the user has ANY of them, access is granted.
 *
 * @param permissions One or more permission identifiers in `resource:action` format
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
