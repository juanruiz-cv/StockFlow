# Proposal: Refresh Token Rotation

## Intent

Current auth issues only JWT access tokens — no refresh token support. This means short-lived sessions with no way to rotate credentials or detect token theft. Add refresh token rotation to prevent reuse of stolen tokens and force re-login on theft detection.

## Scope

### In Scope
- Refresh token generation + storage (new `RefreshToken` entity + TypeORM migration)
- `POST /auth/refresh` endpoint (returns new access + refresh tokens)
- Rotation: invalidate old refresh token on each refresh, issue new one in same family
- Theft detection: presenting an already-used token invalidates the entire family
- Modified `auth-jwt` spec with refresh flow requirements
- Unit + integration tests for rotation and theft scenarios

### Out of Scope
- No UI changes
- No changes to access token generation or JWT structure
- No multi-device session management (future)
- No API contract breakage (same `/auth/login` response extended)

## Capabilities

### New Capabilities
- None — extends existing `auth-jwt` capability

### Modified Capabilities
- `auth-jwt`: Add refresh token generation, rotation, and theft detection requirements

## Approach

1. New `RefreshToken` entity: `id`, `token_hash`, `user_id`, `tenant_id`, `family_id` (UUID), `is_used`, `expires_at`, `created_at`
2. On login: return `access_token` (JWT) + `refresh_token` (opaque, stored hashed with bcrypt)
3. On refresh: verify token hash. If `is_used` → mark entire family as invalidated → force re-login. If clean → mark current used, issue new tokens with same `family_id`
4. Migration: `CREATE TABLE refresh_tokens` via TypeORM migration file

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `entities/refresh-token.entity.ts` | New | RefreshToken TypeORM entity |
| `modules/auth/auth.service.ts` | Modified | Add `refresh()`, `revokeFamily()` methods |
| `modules/auth/auth.controller.ts` | Modified | Add `POST /auth/refresh` |
| `modules/auth/dto/refresh.dto.ts` | New | Refresh request DTO |
| `modules/auth/auth.module.ts` | Modified | Register RefreshToken entity |
| `config/database.config.ts` | Modified | Add RefreshToken to entities list |
| `migrations/` | New | TypeORM migration |
| `openspec/specs/auth-jwt/spec.md` | Modified | Delta spec for refresh requirements |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Race condition: concurrent refresh with same token | Low | DB unique constraint on family_id + is_used |
| Stolen token detection causes user lockout | Low | Clear error message; user can re-login |

## Rollback Plan

1. Remove `/auth/refresh` endpoint and revert controller/service
2. Run down migration: `DROP TABLE refresh_tokens`
3. Remove RefreshToken from `database.config.ts` entities list

## Dependencies

- bcrypt (already in use, reuse for token hashing)

## Success Criteria

- [ ] `POST /auth/refresh` returns new tokens for valid refresh token
- [ ] Reusing a refresh token invalidates all tokens in its family
- [ ] Existing auth unit tests still pass
- [ ] New tests cover: happy refresh, rotation chain, stale token reuse, expired token
