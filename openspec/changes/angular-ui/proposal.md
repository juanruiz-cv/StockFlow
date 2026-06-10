# Proposal: Angular UI — StockFlow Frontend

## Intent

Build the Angular SPA for StockFlow on the existing NestJS API. Current `apps/web/` has no routes or HTTP. Ship auth + 6 feature UIs across 7 sequential PRs.

## Scope

**In**: PRs 1-7 (Foundation, Products, Customers, Stock, Caja, POS, Admin). Login, JWT interceptor, route guard, sidebar shell, lazy routes, CRUD + search per domain, POS cart/payments, Tailwind 4, CDK primitives, signals.

**Out**: NgRx, Angular Material, E2E tests, dark mode, i18n, PWA, SSR, backend changes.

## Capabilities

### New Capabilities
- `app-shell`: Sidebar layout, lazy routes, dashboard landing
- `auth-ui`: Login, auth service, JWT interceptor, guard
- `product-catalog-ui`: Category/brand/supplier/product CRUD + search
- `customer-management-ui`: Customer CRUD + search
- `stock-management-ui`: Stock view, movements, in/out/adjust forms
- `cash-register-ui`: Session open/close, movement list
- `sales-pos-ui`: POS creation, sale history, void
- `admin-ui`: Users CRUD, roles/permissions management
- `shared-ui`: Table, pagination, search, page shell

### Modified Capabilities
None — all existing specs are backend-only.

## Approach

1. **Foundation** (300-500ln) — Deps install, auth service (signals), JWT interceptor, refresh queue, route guard, login page, sidebar layout, dashboard, router config
2. **Products** (500-800ln) — Category/Brand/Supplier/Product CRUD, shared table + pagination + search
3. **Customers** (200-300ln) — Customer list + create/edit + search
4. **Stock** (300-400ln) — Stock view, movement list, in/out/adjust forms. Depends on product selector (PR2)
5. **Caja** (200-300ln) — Session open/close, movements list
6. **POS** (500-700ln) — POS UI (product search, cart, payments, invoice), sale history, void. Depends on PR 2-5
7. **Admin** (300-400ln) — Users + roles/permissions CRUD

Architecture: standalone components, no `.service`/`.component` suffix, zoneless CD, HttpClient + toSignal, Reactive Forms, snake_case→camelCase interceptor. `libs/shared` types reused directly.

## Affected Areas

| Area | Impact | |
|------|--------|-|
| `apps/web/src/app/` | New | All features, auth, layout, shared |
| `apps/web/src/environments/` | New | API base URL |
| `apps/web/src/styles.css` | Modified | Tailwind directives |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JWT refresh race (multi 401) | Medium | Queue concurrent refresh calls |
| Tailwind 4 config churn | Medium | Pin version, use `@tailwind` import |

## Rollback

Revert the commit per PR. Auth revert may force re-login — notify users.

## Dependencies

Tailwind 4 + CDK (npm). Existing `libs/shared` types and NestJS API — no backend changes.

## Success Criteria

- [ ] 7 PRs merged, each ≤400 lines
- [ ] Login + all feature UIs render real API data
- [ ] Route guards block unauthenticated access; permission guards hide unauthorized features
