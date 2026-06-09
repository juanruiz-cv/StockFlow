import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { ProductStock } from '../../entities/product-stock.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { Product } from '../../entities/product.entity';
import { TenantModule } from '../../common/tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductStock, StockMovement, Product]),
    TenantModule,
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
