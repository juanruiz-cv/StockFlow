import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
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
    entities: [Tenant, User, Role, Permission, UserRole, RolePermission],
    subscribers: [TenantRlsSubscriber],
    synchronize: false,
    logging: configService.get<boolean>('DB_LOGGING', false),
  }),
};
