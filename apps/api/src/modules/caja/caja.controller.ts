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
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Caja')
@Controller('caja')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('open')
  @RequirePermission('caja:write')
  @HttpCode(HttpStatus.CREATED)
  async openSession(@Body() dto: OpenSessionDto) {
    return this.cajaService.openSession(dto);
  }

  @Post('close')
  @RequirePermission('caja:write')
  @HttpCode(HttpStatus.OK)
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.cajaService.closeSession(dto);
  }

  @Get('current')
  @RequirePermission('caja:read')
  async getCurrentSession() {
    return this.cajaService.getCurrentSession();
  }

  @Get('history')
  @RequirePermission('caja:read')
  async getHistory() {
    return this.cajaService.getSessionHistory();
  }

  @Get('sessions/:id')
  @RequirePermission('caja:read')
  async getSession(@Param('id') id: string) {
    return this.cajaService.getSessionById(id);
  }

  @Post('movements')
  @RequirePermission('caja:write')
  @HttpCode(HttpStatus.CREATED)
  async addMovement(@Body() dto: CashMovementDto) {
    return this.cajaService.addMovement(dto);
  }

  @Get('sessions/:id/movements')
  @RequirePermission('caja:read')
  async getMovements(@Param('id') id: string) {
    return this.cajaService.getMovements(id);
  }
}
