import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  tenantId: string;
  userId: string;
  email: string;
  roles: string[];
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantContextData>();

  /**
   * Run a function within a tenant context.
   * The context is automatically scoped to the async execution chain.
   */
  run(context: TenantContextData, callback: () => void): void {
    this.als.run(context, callback);
  }

  /**
   * Get the current tenant context for the active async scope.
   * Returns null if no context is set (e.g., unauthenticated routes).
   */
  getCurrentContext(): TenantContextData | null {
    return this.als.getStore() ?? null;
  }

  /**
   * Get the current tenant ID from the async scope.
   * Returns null if no tenant context is active.
   */
  getTenantId(): string | null {
    return this.als.getStore()?.tenantId ?? null;
  }

  /**
   * Get the current user ID from the async scope.
   */
  getUserId(): string | null {
    return this.als.getStore()?.userId ?? null;
  }
}
