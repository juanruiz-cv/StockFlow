import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { CategoriasController } from './categorias.controller';
import { MarcasController } from './marcas.controller';
import { ProveedoresController } from './proveedores.controller';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { Supplier } from '../../entities/supplier.entity';
import { TenantModule } from '../../common/tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Brand, Supplier]),
    TenantModule,
  ],
  controllers: [
    ProductosController,
    CategoriasController,
    MarcasController,
    ProveedoresController,
  ],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
