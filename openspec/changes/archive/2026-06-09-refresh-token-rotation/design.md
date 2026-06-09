# Design: Refresh Token Rotation

## Technical Approach

Extend the existing JWT auth with refresh token rotation using a family-based model. New `RefreshToken` entity + raw SQL queries (bypass RLS, matching login flow pattern). On refresh, use `SELECT FOR UPDATE` to serialize concurrent requests to the same token. Theft detection: presenting a used token (`is_used=true`) triggers family-wide revocation.

Token storage: SHA-256 hash (deterministic, queryable) — NOT bcrypt (non-deterministic, unqueryable). Raw UUID returned to client.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Token hashing**: SHA-256 vs bcrypt | bcrypt is non-deterministic — can't `WHERE token_hash = $1`. SHA-256 enables direct lookup. | SHA-256. Column `token_hash VARCHAR(64)` is the SHA-256 hex digest. |
| **Family model**: family_id UUID vs single-token | Without families, theft detection forces previous token invalidation but can't revoke concurrent sessions. Family allows bulk revocation. | family_id UUID groups linked tokens. On theft, `DELETE WHERE family_id = $1`. |
| **Concurrency**: `SELECT FOR UPDATE` vs unique constraint | Unique on (family_id, is_used) could fail on concurrent writes with ambiguous errors. Row lock serializes deterministically. | `SELECT ... FOR UPDATE` inside a managed transaction. First txn wins; second sees `is_used=true` → theft path. |
| **RLS**: full RLS vs raw queries | RLS needs login-select bypass policy (same as `users_login_select`). Raw queries skip policy overhead entirely. | Raw queries via `DataSource.transaction()` — consistent with existing `validateUser` pattern. No RLS policies needed for refresh_tokens. |
| **Cleanup**: cron vs TTL index | Cron adds infra dependency. Partial index on `expires_at WHERE is_used=true OR expires_at < NOW()` is enough for manual cleanup. | Deferred — add periodic cleanup later. Index enables efficient deletion. |

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│ POST /auth/login { email, password }                      │
│                                                           │
│  → validateUser()         (existing, unchanged)           │
│  → login()                (existing, unchanged)           │
│  → generateRefreshToken() (new)                           │
│      crypto.randomUUID() → raw_token                       │
│      sha256(raw_token) → token_hash                        │
│      INSERT token_hash, family_id, user_id, tenant_id     │
│  → RETURN { access_token, refresh_token: raw_token, user }│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ POST /auth/refresh { refresh_token }                      │
│                                                           │
│  sha256(refresh_token) → token_hash                       │
│  BEGIN TXN                                                │
│  SELECT ... WHERE token_hash = $1 FOR UPDATE              │
│  CASE not found     → 401 "Invalid token"                 │
│  CASE expired       → 401 "Token expired"                 │
│  CASE is_used=true  → THEFT                               │
│       DELETE WHERE family_id = $2                         │
│       COMMIT                                              │
│       409 "Token reused — family revoked"                 │
│  CASE is_used=false → ROTATE                              │
│       UPDATE SET is_used=true WHERE id = $3               │
│       INSERT new token (same family_id, new UUID)         │
│       COMMIT                                              │
│  Generate new access_token (JWT)                          │
│  RETURN { access_token, refresh_token: new_raw, user }    │
└──────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/entities/refresh-token.entity.ts` | Create | TypeORM entity for `refresh_tokens` table |
| `apps/api/src/entities/index.ts` | Modify | Export `RefreshToken` |
| `apps/api/src/config/database.config.ts` | Modify | Add `RefreshToken` to entities array |
| `apps/api/src/modules/auth/auth.service.ts` | Modify | Add `refresh()`, `revokeFamily()`, `generateRefreshToken()` |
| `apps/api/src/modules/auth/auth.controller.ts` | Modify | Add `POST /auth/refresh` endpoint |
| `apps/api/src/modules/auth/dto/refresh.dto.ts` | Create | `refresh_token: string` with `@IsString()` validation |
| `apps/api/src/database/migrations/008-refresh-tokens.sql` | Create | Migration: new table, indexes |
| `apps/api/src/modules/auth/auth.service.spec.ts` | Modify | Unit tests for refresh, rotation, theft |
| `apps/api/src/modules/auth/auth.integration.spec.ts` | Modify | Integration tests for `/auth/refresh` flow |

## Database Migration

File: `apps/api/src/database/migrations/008-refresh-tokens.sql`

```sql
-- Migration 008: Refresh Token Rotation
-- ================================================================
-- TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash  VARCHAR(64) NOT NULL,
  family_id   UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id
  ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_id
  ON refresh_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens(expires_at);
```

## Interfaces / Contracts

```typescript
// Response: login() modified to include refresh_token
{
  access_token: string;     // JWT (unchanged)
  refresh_token: string;    // new — opaque UUID
  user: { id, email, name, tenantId, roles };
}

// Response: POST /auth/refresh
{
  access_token: string;     // new JWT
  refresh_token: string;    // new opaque UUID (same family)
}

// DTO: POST /auth/refresh
class RefreshDto {
  @IsString()
  refresh_token!: string;
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `generateRefreshToken()` | Mock `DataSource.transaction()`, verify raw SQL calls, verify SHA-256 output, verify 7-day expiry |
| Unit | `refresh()` happy path | Mock TXN with clean token → verify `is_used=true` + new token insert |
| Unit | `refresh()` theft detection | Mock TXN with `is_used=true` → verify `DELETE WHERE family_id` → verify 409 |
| Unit | `refresh()` expired token | Mock TXN with past `expires_at` → verify 401 |
| Unit | `refresh()` invalid token | Mock TXN returning empty → verify 401 |
| Integration | `POST /auth/refresh` flow | Mock dataSource & jwtService, verify controller returns correct shape |
| Integration | Rotation chain | After first refresh, use new refresh token → verify second refresh works |
| Integration | Stale token reuse | After refresh, use old token → verify 409 + family revoked |

## Migration / Rollout

1. Apply migration `008-refresh-tokens.sql` — no downtime (new table, no existing code reads it yet)
2. Deploy updated auth module — `login()` now returns `refresh_token` (backward compatible, existing clients ignore extra field)
3. Gradual adoption: clients that ignore `refresh_token` continue working with short-lived access tokens only
4. No rollback needed at migration level — `DROP TABLE refresh_tokens` if revert required

## Open Questions

- [ ] Should refresh tokens auto-cleanup be part of this change or deferred? (Deferred — add scheduler later)
- [ ] Should `max_family_size` limit exist to prevent unbounded token chains? (Not in scope — single-device assumption)
- [ ] What HTTP status for theft detection? 409 Conflict (as designed) or 401? Decided: 409 — the token is valid, the *state* is conflicting.
