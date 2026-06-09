# Proposal: Fase 2 — Núcleo Transaccional

## Intent

Complete StockFlow's transactional core. Fase 1 delivered auth, users, roles — no product catalog, customers, stock, cash handling, or sales. This phase delivers every module needed to run a POS: from product registration through invoicing, with stock control and cash session tracking.

## Scope

### In Scope
- Product catalog: Categories, Brands, Suppliers, Products CRUD
- Customer management: Customers CRUD
- Stock: current stock tracking + movement ledger (in/out/adjust)
- Cash register: session open/close + cash movements
- POS & Sales: sales with line items, payments, invoice generation
- 5 migration files (1 per module) + demo seed data
- 6 new permission groups: products, customers, stock, cash, sales, invoices
- Invoice numbering via tenant-scoped sequences

### Out of Scope
- Angular UI (remains scaffolded)
- Reports & dashboard (Fase 3)
- External integrations (e-commerce, supplier API)
- Refresh token rotation (deferred)
- Redis cache

## Capabilities

### New Capabilities
- **product-catalog**: Categories, Brands, Suppliers, Products CRUD with tenant isolation
- **customer-management**: Customers CRUD with tenant isolation
- **stock-management**: Current stock (product-stock) + movement ledger (stock-movements)
- **cash-register**: Cash session open/close + cash movements (ingresos/egresos)
- **sales-pos**: Sales with line items, payments (cash/card/transfer), invoice generation

### Modified Capabilities
None — greenfield transactional modules. No existing spec behavior changes.

## Approach

5 modules built in dependency order:
1. **Productos** (no deps) → 2. **Clientes** (no deps) → 3. **Stock** (depends on productos) → 4. **Caja** (no deps) → 5. **POS & Ventas** (depends on clientes, stock, caja)

Key decisions:
- **Migrations**: 1 SQL file per module — IF NOT EXISTS, indexes, RLS policies, UPDATE triggers for `updated_at`
- **Stock consistency**: TypeORM QueryRunner transaction — validate qty before deduct, row-level lock on product-stock, rollback on failure
- **Invoice numbering**: `tenant_sequences` table — atomic `UPDATE ... RETURNING next_val` per tenant
- **Cash session**: Partial UNIQUE INDEX `(tenant_id, closed_at) WHERE closed_at IS NULL` — enforces one open session per tenant
- **Seed**: find-then-insert idempotent — default category, brand, supplier, 5 sample products, 1 demo customer
- **Decimal(12,2)** for all monetary/quantity columns

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/modules/productos/` | New | Categories, Brands, Suppliers, Products |
| `apps/api/src/modules/clientes/` | New | Customers CRUD |
| `apps/api/src/modules/stock/` | New | Stock movements, current stock |
| `apps/api/src/modules/caja/` | New | Cash sessions, cash movements |
| `apps/api/src/modules/pos-ventas/` | New | Sales, payments, invoices |
| `apps/api/src/db/migrations/` | New | 5 sequential migration files |
| `apps/api/src/db/seed/` | Modified | Add demo transactional data |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stock inconsistency on concurrent sales | Med | QueryRunner transaction + row-level lock on product-stock row |
| Invoice number collision | Low | `tenant_sequences` atomic increment via `UPDATE ... RETURNING` |
| Cash session left open | Low | Enforce close via partial unique index; periodic cleanup (deferred) |

## Rollback Plan

Pre-migration: `git checkout main`. Per-module: run down-migration SQL (`DROP TABLE IF EXISTS ... CASCADE`). Post-seed: truncate transactional tables before schema rollback.

## Dependencies

- Fase 1 (core-infra-auth) — tenant isolation, auth, JWT guards, users, roles, permissions
- TypeORM + PostgreSQL 17 — same as current stack

## Success Criteria

- [ ] Seed script creates demo products, customers, stock, and open cash session
- [ ] `POST /sales` completes full flow: validate stock → deduct → record payment → generate invoice number
- [ ] Concurrent sales on same product fail with "stock insufficient" (no oversell)
- [ ] Cash session endpoint rejects opening a second session while one is open
- [ ] Invoice numbers sequential per tenant, reset on new session
- [ ] `npx nx run-many -t test --all` passes for all new modules
