import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PosVentasService } from './pos-ventas.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Ventas')
@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosVentasController {
  constructor(private readonly posVentasService: PosVentasService) {}

  @Post()
  @RequirePermission('sales:write')
  @HttpCode(HttpStatus.CREATED)
  async createSale(@Body() dto: CreateSaleDto) {
    return this.posVentasService.createSale(dto);
  }

  @Get()
  @RequirePermission('sales:read')
  async getAllSales() {
    return this.posVentasService.getAllSales();
  }

  @Get(':id')
  @RequirePermission('sales:read')
  async getSaleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.posVentasService.getSaleById(id);
  }

  @Post(':id/void')
  @RequirePermission('sales:void')
  @HttpCode(HttpStatus.OK)
  async voidSale(@Param('id', ParseUUIDPipe) id: string) {
    return this.posVentasService.voidSale(id);
  }
}
