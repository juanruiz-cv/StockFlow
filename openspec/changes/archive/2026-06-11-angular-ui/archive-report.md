# Archive Report: angular-ui

**Change**: Angular UI — StockFlow Frontend
**Archived**: 2026-06-11
**Mode**: openspec
**Verdict**: PASS WITH WARNINGS

---

## Change Summary

Built the complete Angular SPA for StockFlow on the existing NestJS API. Delivered auth + 6 feature UIs across 7 sequential PRs (~2,300–3,400 lines). All 54 tasks complete, 141/141 tests passing, build successful.

## Key Decisions

| Decision | Choice | Details |
|----------|--------|---------|
| Auth flow | Login → localStorage JWT → interceptor + 401 refresh queue | No HttpOnly cookies; API on different origin in dev |
| State management | Signals (no NgRx) | Per-feature signals + computed |
| Styling | Tailwind CSS 4 | CSS-first, `@import "tailwindcss"` |
| Component architecture | Standalone (no NgModules), no `.component`/`.service` suffix | Angular 20 conventions |
| UI primitives | Angular CDK (no Material) | Sortable/paginated table, overlay modal, toast |
| Routing | Lazy-loaded with `canActivate` guards | Feature-based lazy routes |
| PR strategy | 7 stacked PRs → main | Foundation → parallelizable features → admin |

## Architecture Deviations

| Deviation | Design | Actual | Impact |
|-----------|--------|--------|--------|
| Auth location | `auth/` at root | `core/auth/` | Minor — structure preference |
| API layer | `BaseApiService` base class | Direct `HttpClient` per service | Minor — some duplication |
| Error handling | Global error interceptor → Toast | Auth interceptor only, no global error handler | Partial — non-auth errors not centrally handled |
| Password validation | min 6 chars (U2) | Only `Validators.required` | Spec deviation — warning |

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| auth-ui | Created | New main spec — Angular auth UI (login, session, interceptor, guard) |
| products-ui | Created | New main spec — product/category/brand/supplier CRUD UI |
| customers-ui | Created | New main spec — customer CRUD with soft-delete UI |
| stock-ui | Created | New main spec — stock view and movement UIs |
| caja-ui | Created | New main spec — cash register session/movement UIs |
| sales-ui | Created | New main spec — POS, sale history, void UIs |
| admin-ui | Created | New main spec — user/role/permission management UIs |

## Archive Contents

- proposal.md ✅ — Intent, scope, approach, risks, rollback
- specs/ (7 domains) ✅ — Full delta specs for all UI domains
- design.md ✅ — Architecture decisions, data flow, file structure, test strategy
- tasks.md ✅ — 54/54 tasks complete across 7 PRs
- verify-report.md ✅ — 141/141 tests, build OK, 7 warnings, 0 critical issues
- archive-report.md ✅ — This file

## Final Status

| Metric | Value |
|--------|-------|
| Tasks | 54/54 ✅ |
| Tests | 141/141 ✅ |
| Build | Successful ✅ |
| Spec compliance | 47/48 scenarios ✅ (U2: password min-length not enforced) |
| Warnings | 7 ⚠️ (3 build unused-imports, 3 design deviations, 1 spec deviation) |
| Critical issues | 0 ✅ |

## Recommendations (Post-Archive)

1. **W1** — Enforce `minLength(6)` on password field in login form (5-minute fix)
2. **W5/W6** — Remove unused `confirm-dialog.ts` and `app-can.directive.ts` or wire them into entry points
3. **S1** — Add TestBed component tests for rendering and HTTP interception
4. **S2** — Implement a global HTTP error interceptor for non-auth errors

## Next Steps

The change is fully planned, implemented, verified, and archived. The new UI specs are now the source of truth in `openspec/specs/`. Ready for the next change.

---

*Archived by sdd-archive on 2026-06-11*
