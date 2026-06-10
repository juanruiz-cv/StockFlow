import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
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
import { seedRolesPermissions } from './seeds/001-roles-permissions';
import { seedTransaccional } from './seeds/002-transaccional';

dotenv.config();

async function runSeeds() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'stockflow',
    password: process.env.DATABASE_PASSWORD || 'stockflow_dev',
    database: process.env.DATABASE_NAME || 'stockflow',
    entities: [
      Tenant, User, Role, Permission, UserRole, RolePermission,
      Category, Brand, Supplier, Product, Customer,
      ProductStock, StockMovement,
      CashSession, CashMovement,
      Sale, SaleItem, Payment, Invoice, TenantSequence, RefreshToken,
    ],
    logging: false,
  });

  await dataSource.initialize();
  console.log('[Seed] Database connected.');

  await seedRolesPermissions(dataSource);
  await seedTransaccional(dataSource);

  await dataSource.destroy();
  console.log('[Seed] All seeds completed.');
}

runSeeds().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
