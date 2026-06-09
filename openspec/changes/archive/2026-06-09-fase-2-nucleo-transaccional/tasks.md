# Tasks: Fase 2 — Núcleo Transaccional

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~6,000–7,000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (feature-branch-chain) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Products + Customers | PR 1 | Base=`main`; migrations 003–004 |
| 2 | Stock + Caja | PR 2 | Base=`main` (after PR 1 merged); migrations 005–006 |
| 3 | POS/Ventas + Seed | PR 3 | Base=`main` (after PR 2 merged); migration 007 |

## Phase 1: Foundation & Entities

- [x] 1.1 Create 5 entity files (PR 1 scope): category, brand, supplier, product, customer (remaining 9 entities for PR 2+3)
- [x] 1.2 Create 2 migration SQL files (003-productos, 004-clientes) — IF NOT EXISTS, RLS policies, indexes, `updated_at` trigger (remaining 3 migrations for PR 2+3)
- [x] 1.3 Register entities in `config/database.config.ts` and export from `entities/index.ts`
- [x] 1.4 Import 2 new modules (productos, clientes) in `app.module.ts` (remaining 3 modules for PR 2+3)
- [x] 1.5 Create entity files: ProductStock, StockMovement, CashSession, CashMovement
- [x] 1.6 Create migration SQL files 005-stock + 006-caja — IF NOT EXISTS, RLS, indexes, updated_at trigger
- [x] 1.7 Register stock + caja entities in database.config.ts + entities/index.ts
- [x] 1.8 Import StockModule + CajaModule in app.module.ts

## Phase 2: Productos Module

- [x] 2.1 Create `productos.module.ts`, `productos.service.ts` — CRUD with tenant scoping
- [x] 2.2 Create controllers: `productos`, `categorias`, `marcas`, `proveedores` — JWT + Permissions guard
- [x] 2.3 Create DTOs per entity — class-validator, SKU uniqueness check

## Phase 3: Clientes Module

- [x] 3.1 Create `clientes.module.ts`, `clientes.service.ts` — CRUD with search, pagination, soft-delete
- [x] 3.2 Create `clientes.controller.ts` with paginated GET, PATCH, soft-delete DELETE
- [x] 3.3 Create DTOs with email uniqueness validation

## Phase 4: Stock Module

- [x] 4.1 Create `stock.module.ts`, `stock.service.ts` — inbound/outbound/adjust with QueryRunner + FOR UPDATE
- [x] 4.2 Create `stock.controller.ts` — GET product-stock, POST movements/in/out/adjust
- [x] 4.3 Create DTOs: MovementInDto, MovementOutDto, AdjustDto

## Phase 5: Caja Module

- [x] 5.1 Create `caja.module.ts`, `caja.service.ts` — open/close session, cash movements, balance reconciliation
- [x] 5.2 Create `caja.controller.ts` — POST open/close, GET session, POST movements
- [x] 5.3 Create DTOs: OpenSessionDto, CloseSessionDto, CashMovementDto

## Phase 6: POS & Ventas Module

- [x] 6.1 Create `pos-ventas.module.ts`, `pos-ventas.service.ts` — createSale with atomic stock deduct + payment validation + invoice seq
- [x] 6.2 Create `pos-ventas.controller.ts` — POST/GET sales, POST `/sales/:id/void`
- [x] 6.3 Create DTOs: CreateSaleDto, SaleItemDto, PaymentDto — sum(payments) = total validation
- [x] 6.4 Implement `tenant_sequences` atomic increment via `UPDATE ... RETURNING`

## Phase 7: Seed & Tests

- [x] 7.1 Create `database/seeds/002-transaccional.ts` — find-then-insert idempotent demo data (PR 1 scope: categories, brands, suppliers, products, customers)
- [x] 7.2 Unit tests: productos (CRUD + SKU dup + tenant isolation)
- [x] 7.3 Unit tests: clientes (CRUD + search + soft-delete + email dup)
- [x] 7.4 Unit tests: stock (movements + insufficient stock + FOR UPDATE lock)
- [x] 7.5 Unit tests: caja (open/close + dual-session rejection + movement validation)
- [x] 7.6 Unit tests: pos-ventas (full sale flow + payment mismatch + invoice seq + rollback)
- [x] 7.7 Verify `npx nx run-many -t test --all` passes (PR 2 scope: all 109 tests pass; PR 3 scope: all 124 tests pass)
