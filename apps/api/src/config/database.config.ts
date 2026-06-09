import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Category } from '../entities/category.entity';
import { Brand } from '../entities/brand.entity';
import { Supplier } from '../entities/supplier.entity';
import { Product } from '../entities/product.entity';
import { Customer } from '../entities/customer.entity';
import { ProductStock } from '../entities/product-stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { CashSession } from '../entities/cash-session.entity';
import { CashMovement } from '../entities/cash-movement.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { Payment } from '../entities/payment.entity';
import { Invoice } from '../entities/invoice.entity';
import { TenantSequence } from '../entities/tenant-sequence.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TenantRlsSubscriber } from '../common/tenants/tenant-rls.subscriber';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST'),
    port: configService.get<number>('DATABASE_PORT'),
    username: configService.get<string>('DATABASE_USER'),
    password: configService.get<string>('DATABASE_PASSWORD'),
    database: configService.get<string>('DATABASE_NAME'),
    entities: [Tenant, User, Role, Permission, UserRole, RolePermission, Category, Brand, Supplier, Product, Customer, ProductStock, StockMovement, CashSession, CashMovement, Sale, SaleItem, Payment, Invoice, TenantSequence, RefreshToken],
    subscribers: [TenantRlsSubscriber],
    synchronize: false,
    logging: configService.get<boolean>('DB_LOGGING', false),
  }),
};
