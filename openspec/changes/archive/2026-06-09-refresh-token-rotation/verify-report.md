# Verify Report: Refresh Token Rotation

**Date**: 2026-06-09  
**Verifier**: sdd-verify  
**Verdict**: **PASS with issues**

---

## Executive Summary

All 14 tasks are completed and marked `[x]`. All 24 auth-related tests pass (12 unit + 12 integration). Build errors and missing lint target are pre-existing and unrelated. Three issues found in the delta spec (bcrypt vs SHA-256, field naming, invalidation wording) that must be fixed before archiving.

---

## 1. Task Completion

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Foundation | 1.1–1.4 (4 tasks) | ✅ All `[x]` |
| 2. Core Implementation | 2.1–2.5 (5 tasks) | ✅ All `[x]` |
| 3. Testing | 3.1–3.5 (5 tasks) | ✅ All `[x]` |
| **Total** | **14 tasks** | **✅ All marked complete** |

---

## 2. Compliance Matrix: Spec → Implementation → Tests

### MODIFIED: Email/Password Login

| Spec Scenario | Implementation | Tests | Result |
|---|---|---|---|
| A1: POST /auth/login returns JWT + refreshToken | `auth.controller.ts:27-40` → calls `auth.service.login()` which returns `{ access_token, refresh_token, user }` | `auth.service.spec.ts` login test verifies shape; `auth.integration.spec.ts` 6.5 verifies controller shape | ✅ |
| A2: Passwords verified via bcrypt | `auth.service.ts:39` — `bcrypt.compare(password, userRow.password_hash)` | `auth.service.spec.ts` validateUser:4 tests verify valid/invalid/inactive scenarios | ✅ |
| Successful login: JWT with sub, tenant_id, roles | `auth.service.ts:67-71` — JWT payload includes sub, email, tenant_id, roles | `auth.service.spec.ts` login test verifies payload | ✅ |
| Successful login: refreshToken in response | `auth.service.ts:74` — `generateRefreshToken()` called and returned as `refresh_token` | `auth.service.spec.ts` login test verifies `refresh_token` is UUID-shaped string | ✅ |
| Invalid credentials → 401 | `auth.controller.ts:36` throws `UnauthorizedException` | Integration tests 6.5 cover wrong password, missing email, inactive account | ✅ |

### ADDED: Refresh Token Entity

| Spec Scenario | Implementation | Tests | Result |
|---|---|---|---|
| Token stored with family metadata (hash, user_id, tenant_id, family_id, is_used=false, 7-day TTL) | `refresh-token.entity.ts` — all columns present; `auth.service.ts:105-120` — generates SHA-256 hash, UUID family_id, 7-day expiry | `auth.service.spec.ts` generateRefreshToken tests verify INSERT params | ✅ |

### ADDED: Token Refresh Endpoint

| Spec Scenario | Implementation | Tests | Result |
|---|---|---|---|
| Successful refresh with rotation: 200 + new JWT + new token same family; old marked used | `auth.service.ts:133-196` — SELECT FOR UPDATE, UPDATE is_used, INSERT new token same family_id | `auth.service.spec.ts` refresh 3.2: verifies SELECT+FOR+UPDATE+INSERT; `auth.integration.spec.ts` 3.5: rotation chain | ✅ |
| Expired token → 401 "refresh token expired" | `auth.service.ts:158-160` — checks `expires_at < now()` → `UnauthorizedException('Refresh token expired')` | `auth.service.spec.ts` 3.3: expired token test; `auth.integration.spec.ts` 3.5: expired test | ✅ |
| Invalid token → 401 | `auth.service.ts:149-151` — empty row → `UnauthorizedException('Invalid refresh token')` | `auth.service.spec.ts` 3.3: not-found test; `auth.integration.spec.ts` 3.5: not-found test | ✅ |

### ADDED: Theft Detection and Family Revocation

| Spec Scenario | Implementation | Tests | Result |
|---|---|---|---|
| Reused token → 409 Conflict + family revoked | `auth.service.ts:163-168` — `is_used=true` → `DELETE WHERE family_id` → `ConflictException` | `auth.service.spec.ts` 3.4: theft detection verifies DELETE + 409; `auth.integration.spec.ts` 3.5: stale reuse test | ✅ |
| User must re-login | Implicit — all tokens deleted, no valid token remains | N/A (functional outcome) | ✅ |

---

## 3. Design Coherence

| Design Decision | Implementation | Status |
|---|---|---|
| SHA-256 hashing (not bcrypt) | `crypto.createHash('sha256').update(rawToken).digest('hex')` in `auth.service.ts:107, 134, 179` | ✅ |
| Family rotation (UUID family_id) | `crypto.randomUUID()` for family_id on creation; reused on refresh `auth.service.ts:108, 185` | ✅ |
| `SELECT FOR UPDATE` concurrency | `...FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE` in `auth.service.ts:141-147` | ✅ |
| Theft detection → DELETE family | `DELETE FROM refresh_tokens WHERE family_id = $1` in `auth.service.ts:164-167` | ✅ |
| Raw queries via DataSource (no RLS) | All queries use `manager.query()` / `this.dataSource.query()` — no TypeORM repository methods | ✅ |
| 7-day TTL | `Date.now() + 7*24*60*60*1000` in `auth.service.ts:109, 180` | ✅ |
| Migration (table + 5 indexes) | `008-refresh-tokens.sql` — all columns, constraints, indexes match design | ✅ |

---

## 4. Test Results

### Auth-specific tests: 24 tests, all ✅

| File | Tests | New (this change) | Pre-existing | Status |
|---|---|---|---|---|
| `auth.service.spec.ts` | 12 | 6 (generateRefreshToken:2, refresh:4) | 6 (validateUser:4, login:1, getMe:1) | ✅ **PASS** |
| `auth.integration.spec.ts` | 12 | 5 (refresh flow:5) | 7 (login flow:4, PermissionsGuard:3) | ✅ **PASS** |

### Full project test suite: 135 tests, all ✅

### Build Check
- `api:build`: ❌ Pre-existing TS6059 rootDir errors (related to `@stockflow/shared` library, **not** this change)
- `web:build`: ❌ Pre-existing `@angular-devkit/architect` missing (**not** related to this change)
- `shared:build`: ✅ Builds OK

### Lint Check
- `nx lint api`: ⚠️ No lint target configured for the api project (pre-existing, not related to this change)

---

## 5. Issues Found

### 🔴 CRITICAL — Spec bug: bcrypt vs SHA-256

**File**: `openspec/changes/refresh-token-rotation/specs/auth-jwt/spec.md` line 31  
**Problem**: Delta spec says *"hashed with bcrypt"* but the design explicitly chose SHA-256 (design.md lines 7, 13) with the rationale that bcrypt is non-deterministic and can't be used for `WHERE token_hash = $1` lookups. The implementation correctly uses SHA-256.
**Impact**: If the spec is merged into the main spec as-is, future readers will see bcrypt while the code uses SHA-256.
**Fix**: Change line 31 from *"hashed with bcrypt"* to *"hashed with SHA-256"* before archiving.

### 🟡 WARNING — Response field name: `refreshToken` vs `refresh_token`

**File**: `openspec/changes/refresh-token-rotation/specs/auth-jwt/spec.md` lines 11, 19, 41  
**Problem**: The spec scenarios use `refreshToken` (camelCase) but the implementation returns `refresh_token` (snake_case), consistent with the existing `access_token` convention. The design.md also uses `refresh_token` consistently.
**Impact**: Spec-to-implementation mismatch in field naming.
**Fix**: Update spec to use `refresh_token` matching the implementation and existing conventions.

### 🟡 WARNING — Invalidation wording: "marked as invalidated" vs DELETE

**File**: `openspec/changes/refresh-token-rotation/specs/auth-jwt/spec.md` lines 65-66  
**Problem**: Spec says *"ALL tokens sharing that family_id are marked as invalidated"* but the implementation DELETES them (`DELETE FROM refresh_tokens WHERE family_id = $1`). The design also says DELETE.
**Impact**: Spec wording doesn't match actual behavior (though the outcome is functionally equivalent).
**Fix**: Update spec wording from *"marked as invalidated"* to *"deleted"* to match the implementation.

### ℹ️ SUGGESTION — No lint target

The `api` project has no lint target configured in its Nx project configuration. Consider adding ESLint configuration for code quality enforcement.

### ℹ️ SUGGESTION — Pre-existing build errors

The `api:build` and `web:build` targets fail due to pre-existing configuration issues (TS6059 rootDir, missing @angular-devkit/architect). These are **not** caused by this change.

---

## 6. File Change Verification

| Design File | Action | Actual File | Exists? | Status |
|---|---|---|---|---|
| `entities/refresh-token.entity.ts` | Create | `apps/api/src/entities/refresh-token.entity.ts` | ✅ | ✅ Matches design |
| `entities/index.ts` | Modify | Export `RefreshToken` added | ✅ | ✅ |
| `config/database.config.ts` | Modify | `RefreshToken` in entities array | ✅ | ✅ |
| `auth.service.ts` | Modify | 3 new methods (generateRefreshToken, refresh, signRefreshAccessToken) + modified login | ✅ | ✅ |
| `auth.controller.ts` | Modify | Added `POST /auth/refresh` | ✅ | ✅ |
| `dto/refresh.dto.ts` | Create | `@IsString() refresh_token` | ✅ | ✅ |
| `migrations/008-refresh-tokens.sql` | Create | Table + 5 indexes | ✅ | ✅ Matches design |
| `auth.service.spec.ts` | Modify | 6 new unit tests | ✅ | ✅ |
| `auth.integration.spec.ts` | Modify | 5 new integration tests | ✅ | ✅ |

---

## Final Verdict

**Status**: ✅ **PASS** (with issues to fix before archive)

**All implementation is correct**. The code matches the design document, all 14 tasks are complete, all 24 auth tests pass, and the design decisions (SHA-256, FOR UPDATE, family rotation, theft detection) are faithfully implemented.

**Three spec-level issues** must be fixed before archiving: the bcrypt→SHA-256 correction (critical), the `refreshToken`→`refresh_token` naming alignment, and the "marked as invalidated"→"deleted" wording.

**Next recommended**: sdd-archive (after fixing spec issues listed above)
