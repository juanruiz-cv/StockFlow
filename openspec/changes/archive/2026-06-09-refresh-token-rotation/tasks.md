# Tasks: Refresh Token Rotation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 300–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation + tests | Single PR | Base = main; tests and docs included |

## Phase 1: Foundation

- [x] 1.1 Create `apps/api/src/entities/refresh-token.entity.ts` — TypeORM entity (id, token_hash, family_id, user_id, tenant_id, is_used, expires_at, created_at)
- [x] 1.2 Export `RefreshToken` from `apps/api/src/entities/index.ts`
- [x] 1.3 Register `RefreshToken` in `apps/api/src/config/database.config.ts` entities array
- [x] 1.4 Create `apps/api/src/database/migrations/008-refresh-tokens.sql` — table + indexes (token_hash unique, family_id, user_id, tenant_id, expires_at)

## Phase 2: Core Implementation

- [x] 2.1 Create `apps/api/src/modules/auth/dto/refresh.dto.ts` — `refresh_token: string` with `@IsString()` validation
- [x] 2.2 Add `generateRefreshToken(user, tenantId)` to `auth.service.ts` — SHA-256 hash, raw UUID to client, INSERT via DataSource.transaction()
- [x] 2.3 Modify `login()` in `auth.service.ts` to call `generateRefreshToken()` and include `refresh_token` in response
- [x] 2.4 Add `refresh(refreshDto)` to `auth.service.ts` — SELECT FOR UPDATE, rotation (mark used + insert new), theft detection (DELETE family), expiry check
- [x] 2.5 Add `POST /auth/refresh` route + handler in `auth.controller.ts` — calls service.refresh(), returns `{ access_token, refresh_token }`

## Phase 3: Testing

- [x] 3.1 Unit tests in `auth.service.spec.ts`: `generateRefreshToken()` output shape and SHA-256 hashing
- [x] 3.2 Unit tests: `refresh()` happy path — rotation produces new token in same family
- [x] 3.3 Unit tests: `refresh()` expired token → 401, invalid token → 401
- [x] 3.4 Unit tests: `refresh()` theft detection — used token → DELETE family → 409
- [x] 3.5 Integration tests in `auth.integration.spec.ts`: `/auth/refresh` flow — rotation chain, stale token reuse, family revocation
