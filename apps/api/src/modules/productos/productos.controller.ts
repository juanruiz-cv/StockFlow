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
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Productos')
@Controller('productos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @RequirePermission('products:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductoDto) {
    return this.productosService.createProduct(dto);
  }

  @Get()
  @RequirePermission('products:read')
  async findAll() {
    return this.productosService.findAllProducts();
  }

  @Get(':id')
  @RequirePermission('products:read')
  async findOne(@Param('id') id: string) {
    return this.productosService.findProductById(id);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  async update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.updateProduct(id, dto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.productosService.softDeleteProduct(id);
    return { message: 'Product deactivated successfully' };
  }
}
