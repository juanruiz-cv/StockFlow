import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configValidationSchema } from './config/env.config';
import { typeOrmConfig } from './config/database.config';
import { TenantModule } from './common/tenants/tenant.module';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProductosModule } from './modules/productos/productos.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { StockModule } from './modules/stock/stock.module';
import { CajaModule } from './modules/caja/caja.module';
import { PosVentasModule } from './modules/pos-ventas/pos-ventas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    CacheModule,
    TenantModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProductosModule,
    ClientesModule,
    StockModule,
    CajaModule,
    PosVentasModule,
  ],
})
export class AppModule {}
