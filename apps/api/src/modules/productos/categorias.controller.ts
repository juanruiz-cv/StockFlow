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
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Categorías')
@Controller('categorias')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriasController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @RequirePermission('products:write')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoriaDto) {
    return this.productosService.createCategory(dto);
  }

  @Get()
  @RequirePermission('products:read')
  async findAll() {
    return this.productosService.findAllCategories();
  }

  @Get(':id')
  @RequirePermission('products:read')
  async findOne(@Param('id') id: string) {
    return this.productosService.findCategoryById(id);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.productosService.updateCategory(id, dto);
  }

  @Delete(':id')
  @RequirePermission('products:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.productosService.deleteCategory(id);
    return { message: 'Category deleted successfully' };
  }
}
