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
import { ProductosService } from './productos.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('proveedores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProveedoresController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @RequirePermission('products:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProveedorDto) {
    return this.productosService.createSupplier(dto);
  }

  @Get()
  @RequirePermission('products:read')
  async findAll() {
    return this.productosService.findAllSuppliers();
  }

  @Get(':id')
  @RequirePermission('products:read')
  async findOne(@Param('id') id: string) {
    return this.productosService.findSupplierById(id);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  async update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) {
    return this.productosService.updateSupplier(id, dto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.productosService.deleteSupplier(id);
    return { message: 'Supplier deleted successfully' };
  }
}
