import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { MovementInDto } from './dto/movement-in.dto';
import { MovementOutDto } from './dto/movement-out.dto';
import { AdjustDto } from './dto/adjust.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @RequirePermission('stock:read')
  async getAll() {
    return this.stockService.getAllStock();
  }

  @Get('product/:productId')
  @RequirePermission('stock:read')
  async getProductStock(@Param('productId') productId: string) {
    return this.stockService.getStock(productId);
  }

  @Get('product/:productId/movements')
  @RequirePermission('stock:read')
  async getMovements(@Param('productId') productId: string) {
    return this.stockService.getMovements(productId);
  }

  @Post('inbound')
  @RequirePermission('stock:write')
  @HttpCode(HttpStatus.CREATED)
  async inbound(@Body() dto: MovementInDto) {
    return this.stockService.inbound(dto);
  }

  @Post('outbound')
  @RequirePermission('stock:write')
  @HttpCode(HttpStatus.CREATED)
  async outbound(@Body() dto: MovementOutDto) {
    return this.stockService.outbound(dto);
  }

  @Post('adjust')
  @RequirePermission('stock:write')
  @HttpCode(HttpStatus.CREATED)
  async adjust(@Body() dto: AdjustDto) {
    return this.stockService.adjust(dto);
  }
}
