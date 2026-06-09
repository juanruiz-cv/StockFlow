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
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('marcas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MarcasController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @RequirePermission('products:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMarcaDto) {
    return this.productosService.createBrand(dto);
  }

  @Get()
  @RequirePermission('products:read')
  async findAll() {
    return this.productosService.findAllBrands();
  }

  @Get(':id')
  @RequirePermission('products:read')
  async findOne(@Param('id') id: string) {
    return this.productosService.findBrandById(id);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  async update(@Param('id') id: string, @Body() dto: UpdateMarcaDto) {
    return this.productosService.updateBrand(id, dto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.productosService.deleteBrand(id);
    return { message: 'Brand deleted successfully' };
  }
}
