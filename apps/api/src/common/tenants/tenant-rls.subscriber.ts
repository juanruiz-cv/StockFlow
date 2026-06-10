import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
} from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/**
 * TypeORM subscriber that sets the `app.current_tenant_id` session variable
 * before every database query, when a tenant context is active.
 *
 * This enables PostgreSQL Row-Level Security policies to filter rows
 * based on the current tenant without application-level WHERE clauses.
 *
 * NOTE: This subscriber is instantiated by TypeORM, not by NestJS DI.
 * The TenantContextService is set via a static setter from the NestJS module
 * after initialization.
 */
@EventSubscriber()
export class TenantRlsSubscriber implements EntitySubscriberInterface {
  private static contextService: TenantContextService | null = null;

  /**
   * Called by NestJS after module init to provide the tenant context service.
   */
  static setContextService(service: TenantContextService): void {
    TenantRlsSubscriber.contextService = service;
  }

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Called before any query is executed.
   * Sets the `app.current_tenant_id` session variable to the current
   * tenant ID from the AsyncLocalStorage context.
   */
  async beforeQuery(): Promise<void> {
    const service = TenantRlsSubscriber.contextService;
    if (!service) {
      return; // Tenant context not available yet
    }

    const tenantId = service.getTenantId();
    if (!tenantId) {
      return; // No tenant context — skip (e.g., unauthenticated routes)
    }

    try {
      await this.dataSource.query(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        [tenantId],
      );
    } catch {
      // Silently ignore
    }
  }
}
