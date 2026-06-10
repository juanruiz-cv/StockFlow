/**
 * Standard JWT payload for StockFlow authentication.
 * Embedded as the `user` object in Request after passport validation.
 */
export interface JwtPayload {
  /** User UUID */
  sub: string;

  /** User email */
  email: string;

  /** Tenant UUID — used for RLS isolation */
  tenant_id: string;

  /** Role names (e.g., ['Admin', 'Vendedor']) */
  roles: string[];

  /** Issued at (epoch seconds) */
  iat?: number;

  /** Expiration time (epoch seconds) */
  exp?: number;
}
