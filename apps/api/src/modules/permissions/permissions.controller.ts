import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * GET /api/permissions
   * List all system-defined permissions.
   * Permissions are global system data (seeded), not tenant-scoped.
   */
  @Get()
  async findAll() {
    return this.permissionsService.findAll();
  }
}
