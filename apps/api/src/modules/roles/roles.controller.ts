import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /api/roles
   * List all roles scoped to the current tenant.
   */
  @Get()
  @RequirePermission('roles:read')
  async findAll() {
    return this.rolesService.findAll();
  }

  /**
   * GET /api/roles/:id
   * Get a single role with its permissions.
   */
  @Get(':id')
  @RequirePermission('roles:read')
  async findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  /**
   * POST /api/roles
   * Create a new role scoped to the current tenant.
   */
  @Post()
  @RequirePermission('roles:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  /**
   * PATCH /api/roles/:id
   * Update role name, description, or permissions.
   */
  @Patch(':id')
  @RequirePermission('roles:write')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  /**
   * DELETE /api/roles/:id
   * Delete a role. Returns 409 if users are assigned to it.
   */
  @Delete(':id')
  @RequirePermission('roles:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.rolesService.delete(id);
    return { message: 'Role deleted successfully' };
  }
}
