import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionsGuard } from '../guards/permissions.guard';
import { UserRole } from '../../entities/user-role.entity';

/**
 * Global module that provides PermissionCacheService and PermissionsGuard
 * as singletons across the entire application.
 *
 * PermissionsGuard requires the UserRole repository and the global
 * PermissionCacheService to resolve user permissions.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserRole])],
  providers: [PermissionCacheService, PermissionsGuard],
  exports: [PermissionCacheService, PermissionsGuard],
})
export class CacheModule {}
