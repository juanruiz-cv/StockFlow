import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Customer } from '../../entities/customer.entity';
import { TenantModule } from '../../common/tenants/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    TenantModule,
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
