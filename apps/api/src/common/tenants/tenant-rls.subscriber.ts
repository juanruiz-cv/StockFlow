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
 */
@EventSubscriber()
export class TenantRlsSubscriber implements EntitySubscriberInterface {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Called before any query is executed.
   * Sets the `app.current_tenant_id` session variable to the current
   * tenant ID from the AsyncLocalStorage context.
   *
   * Uses `set_config(..., true)` for local (session-scoped) setting
   * that is automatically reset at transaction end.
   */
  async beforeQuery(): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      return; // No tenant context — skip (e.g., unauthenticated routes)
    }

    try {
      await this.dataSource.query(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        [tenantId],
      );
    } catch {
      // Silently ignore — if the session variable fails, RLS will
      // block the query, which is the correct security behavior.
    }
  }
}
