# Archive Report: Refresh Token Rotation

**Date**: 2026-06-09  
**Archived by**: sdd-archive  
**Mode**: openspec  

## Change Summary

Add secure refresh token rotation with SHA-256 hashing, family-based rotation, and theft detection to the auth-jwt domain.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| auth-jwt | Updated | 1 modified (Email/Password Login), 3 added (Refresh Token Entity, Token Refresh Endpoint, Theft Detection and Family Revocation) |

## Spec Merge Details

- **MODIFIED**: Email/Password Login — updated to include `refresh_token` in login response, added scenario step for `refresh_token` field
- **ADDED**: Refresh Token Entity — SHA-256 hashed tokens with family_id, is_used, expires_at (7-day TTL)
- **ADDED**: Token Refresh Endpoint — POST /auth/refresh with rotation (mark old used, issue new in same family)
- **ADDED**: Theft Detection and Family Revocation — used token reuse triggers 409 Conflict + DELETE family

## Archive Contents

- proposal.md ✅
- specs/auth-jwt/spec.md ✅
- design.md ✅
- tasks.md ✅ (14/14 tasks complete)
- verify-report.md ✅ (PASS with pre-existing fixes applied)
- archive-report.md ✅

## Task Completion Verification

All 14 tasks in the archived tasks.md are checked `[x]`. No stale unchecked tasks found.

## Verification Status

- All 24 auth tests pass (12 unit + 12 integration)
- Project-wide: 135 tests pass
- Verify verdict: PASS (3 spec issues corrected prior to archive)

## Spec Issues Addressed (pre-archive)

The verify report flagged 3 spec issues. All were corrected in the delta spec before archiving:
1. 🔴 CRITICAL — bcrypt → SHA-256 (corrected in delta spec line 31)
2. 🟡 WARNING — refreshToken → refresh_token (scenarios use correct snake_case)
3. 🟡 WARNING — "marked as invalidated" → "deleted" (corrected in delta spec)

## Source of Truth Updated

`openspec/specs/auth-jwt/spec.md` — now reflects refresh token rotation behavior.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
