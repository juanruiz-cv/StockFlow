import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Clientes')
@Controller('clientes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @RequirePermission('customers:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Get()
  @RequirePermission('customers:read')
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientesService.findAll(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @RequirePermission('customers:read')
  async findOne(@Param('id') id: string) {
    return this.clientesService.findById(id);
  }

  @Patch(':id')
  @RequirePermission('customers:write')
  async update(@Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.clientesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('customers:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.clientesService.softDelete(id);
    return { message: 'Customer deactivated successfully' };
  }
}
