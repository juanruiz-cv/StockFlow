import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { CashSession } from '../../entities/cash-session.entity';
import { CashMovement } from '../../entities/cash-movement.entity';
import { TenantModule } from '../../common/tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashSession, CashMovement]),
    TenantModule,
  ],
  controllers: [CajaController],
  providers: [CajaService],
  exports: [CajaService],
})
export class CajaModule {}
