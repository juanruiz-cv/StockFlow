import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /api/permissions
   * List all system-defined permissions.
   * Permissions are global system data (seeded), not tenant-scoped.
   */
  @Get()
  @RequirePermission('roles:read')
  async findAll() {
    return this.permissionsService.findAll();
  }
}
