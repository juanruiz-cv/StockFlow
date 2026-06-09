import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configValidationSchema } from './config/env.config';
import { typeOrmConfig } from './config/database.config';
import { TenantModule } from './common/tenants/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    TenantModule,
  ],
})
export class AppModule {}
