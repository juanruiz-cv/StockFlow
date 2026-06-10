import { MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantRlsSubscriber } from './tenant-rls.subscriber';

@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantModule implements NestModule, OnModuleInit {
  constructor(private readonly contextService: TenantContextService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }

  onModuleInit(): void {
    // Provide the context service to the TypeORM subscriber
    // (subscriber is instantiated by TypeORM, not NestJS DI)
    TenantRlsSubscriber.setContextService(this.contextService);
  }
}
