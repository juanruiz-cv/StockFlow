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

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /api/roles
   * List all roles scoped to the current tenant.
   */
  @Get()
  async findAll() {
    return this.rolesService.findAll();
  }

  /**
   * GET /api/roles/:id
   * Get a single role with its permissions.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  /**
   * POST /api/roles
   * Create a new role scoped to the current tenant.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  /**
   * PATCH /api/roles/:id
   * Update role name, description, or permissions.
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  /**
   * DELETE /api/roles/:id
   * Delete a role. Returns 409 if users are assigned to it.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.rolesService.delete(id);
    return { message: 'Role deleted successfully' };
  }
}
