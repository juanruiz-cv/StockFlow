import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosVentasService } from './pos-ventas.service';
import { PosVentasController } from './pos-ventas.controller';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment } from '../../entities/payment.entity';
import { Invoice } from '../../entities/invoice.entity';
import { TenantSequence } from '../../entities/tenant-sequence.entity';
import { ProductStock } from '../../entities/product-stock.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { Product } from '../../entities/product.entity';
import { TenantModule } from '../../common/tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      Payment,
      Invoice,
      TenantSequence,
      ProductStock,
      StockMovement,
      Product,
    ]),
    TenantModule,
  ],
  controllers: [PosVentasController],
  providers: [PosVentasService],
  exports: [PosVentasService],
})
export class PosVentasModule {}
