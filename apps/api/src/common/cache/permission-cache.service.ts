import { Injectable } from '@nestjs/common';

interface CacheEntry {
  permissions: string[];
  expiresAt: number;
}

/**
 * Simple in-memory cache for user permissions with configurable TTL.
 *
 * Used by PermissionsGuard to avoid querying role-permission mappings
 * on every request. Cache is invalidated when role assignments change.
 *
 * Key format: `${tenantId}:${userId}`
 */
@Injectable()
export class PermissionCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Retrieve cached permissions for a key.
   * Returns null if key is not found or the entry has expired.
   */
  get(key: string): string[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.permissions;
  }

  /**
   * Store permissions for a key with a TTL.
   * Default TTL is 30 seconds.
   */
  set(key: string, permissions: string[], ttlMs = 30_000): void {
    this.cache.set(key, {
      permissions,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate cache for a specific user in a tenant.
   * Called when roles are assigned or removed.
   */
  invalidate(userId: string, tenantId: string): void {
    this.cache.delete(`${tenantId}:${userId}`);
  }

  /**
   * Clear the entire permission cache.
   * Useful for testing or bulk operations.
   */
  invalidateAll(): void {
    this.cache.clear();
  }
}
