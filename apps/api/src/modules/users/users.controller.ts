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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/users
   * Create a new user within the current tenant.
   */
  @Post()
  @RequirePermission('users:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * GET /api/users
   * List all non-deleted users in the current tenant.
   */
  @Get()
  @RequirePermission('users:read')
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /api/users/:id
   * Get a user by ID within the current tenant.
   */
  @Get(':id')
  @RequirePermission('users:read')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /**
   * PATCH /api/users/:id
   * Update user fields (email, name, active status).
   */
  @Patch(':id')
  @RequirePermission('users:write')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * DELETE /api/users/:id
   * Soft-delete a user (sets deleted_at timestamp).
   */
  @Delete(':id')
  @RequirePermission('users:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.usersService.softDelete(id);
    return { message: 'User deactivated successfully' };
  }

  /**
   * POST /api/users/:userId/roles
   * Assign a role to a user.
   */
  @Post(':userId/roles')
  @RequirePermission('users:write')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(userId, dto.roleId);
  }

  /**
   * DELETE /api/users/:userId/roles/:roleId
   * Remove a role from a user.
   */
  @Delete(':userId/roles/:roleId')
  @RequirePermission('users:write')
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.usersService.removeRole(userId, roleId);
  }
}
