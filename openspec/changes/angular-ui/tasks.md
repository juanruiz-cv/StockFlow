# Tasks: Angular UI — StockFlow Frontend

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

7 PRs planned (2,300–3,400 lines). PR 1 foundation, PR 2–7 features. Chain strategy needs user choice: stacked-to-main vs feature-branch-chain vs size:exception.

## PR 1 — Foundation ✅

- [x] 1.1 `app.config.ts` — HttpClient, router, zoneless
- [x] 1.2 `environments/environment.ts` — API_BASE_URL
- [x] 1.3 `styles.css` — `@import "tailwindcss"`
- [x] 1.4 `auth/models.ts` — types
- [x] 1.5 `auth/token.service.ts`
- [x] 1.6 `auth/auth.service.ts` — session signal, login, logout
- [x] 1.7 `auth/auth.interceptor.ts` — Bearer + 401 refresh
- [x] 1.8 `auth/auth.guard.ts`
- [x] 1.9 `auth/login.page.ts` — Reactive Form
- [x] 1.10 `layout/sidebar.ts`, `sidebar-item.ts`, `page-shell.ts`
- [x] 1.11 `features/dashboard/dashboard.page.ts`
- [x] 1.12 `app.routes.ts` — lazy routes with guards
- [x] 1.13 Tests: token service

## PR 2 — Products

- [x] 2.1 `shared/ui/table.ts` — CDK sortable/paginated
- [x] 2.2 `shared/ui/search-input.ts`
- [x] 2.3 `shared/ui/page-shell.ts` (implementado en `layout/page-shell.ts`)
- [x] 2.4 `features/products/models.ts`
- [x] 2.5 `features/products/product.service.ts`
- [x] 2.6 `features/products/product-list.page.ts`
- [x] 2.7 `features/products/product-form.page.ts`
- [x] 2.8 Category/brand/supplier list + form pages
- [x] 2.9 Test: list, validation, search, duplicate SKU

## PR 3 — Customers

- [x] 3.1 `features/customers/models.ts`
- [x] 3.2 `features/customers/customer.service.ts`
- [x] 3.3 `features/customers/customer-list.page.ts`
- [x] 3.4 `features/customers/customer-form.page.ts`
- [x] 3.5 Route + test

## PR 4 — Stock

- [x] 4.1 `features/stock/models.ts`
- [x] 4.2 `features/stock/stock.service.ts`
- [x] 4.3 `features/stock/stock.page.ts`
- [x] 4.4 `features/stock/movement-list.page.ts`
- [x] 4.5 `features/stock/movement-form.page.ts`
- [x] 4.6 Route + test

## PR 5 — Caja

- [ ] 5.1 `features/caja/models.ts`
- [ ] 5.2 `features/caja/caja.service.ts`
- [ ] 5.3 `features/caja/session.page.ts`
- [ ] 5.4 `features/caja/movement-list.page.ts`
- [ ] 5.5 Route + test

## PR 6 — POS

- [ ] 6.1 `features/sales/models.ts`
- [ ] 6.2 `features/sales/sale.service.ts`
- [ ] 6.3 `shared/ui/modal.ts`
- [ ] 6.4 `shared/ui/confirm-dialog.ts`
- [ ] 6.5 `shared/ui/toast.ts`
- [ ] 6.6 `features/sales/pos.page.ts`
- [ ] 6.7 `features/sales/sale-history.page.ts`
- [ ] 6.8 Route + test

## PR 7 — Admin

- [ ] 7.1 `features/admin/models.ts`
- [ ] 7.2 `features/admin/admin.service.ts`
- [ ] 7.3 `features/admin/user-list.page.ts`
- [ ] 7.4 `features/admin/user-form.page.ts`
- [ ] 7.5 `features/admin/role-list.page.ts`
- [ ] 7.6 `features/admin/role-form.page.ts`
- [ ] 7.7 `*appCan` directive
- [ ] 7.8 Route + test
