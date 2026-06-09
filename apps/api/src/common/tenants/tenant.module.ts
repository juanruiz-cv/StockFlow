import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantRlsSubscriber } from './tenant-rls.subscriber';

@Module({
  providers: [TenantContextService, TenantRlsSubscriber],
  exports: [TenantContextService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
