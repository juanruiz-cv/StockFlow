# Design: Fase 2 — Núcleo Transaccional

## Technical Approach

Five NestJS modules mirroring existing patterns: entities in `entities/`, services with `TenantContextService` + RLS, controllers with `@UseGuards(JwtAuthGuard, PermissionsGuard)`, DTOs with `class-validator`. Dependency order: **productos** → **clientes** → **stock** → **caja** → **pos-ventas**. Stock consistency via `QueryRunner` + `FOR UPDATE` row locks. Invoice numbering via atomic `UPDATE tenant_sequences ... RETURNING`. Cash session guard via partial unique index. All monetary/quantity columns `DECIMAL(12,2)`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Entity location | Subfolder vs flat | `entities/` — consistent with User, Role |
| Invoice numbering | UUID simple but non-sequential | `tenant_sequences` + `UPDATE ... RETURNING` |
| Stock consistency | App-level vs DB-level lock | `QueryRunner` + `SELECT ... FOR UPDATE` |
| Cash session guard | App-only has race window | Partial UNIQUE INDEX `(tenant_id) WHERE closed_at IS NULL` |
| Sale void | Hard delete breaks audit | `status` column (`active`/`voided`) |
| Controller granularity | 1 controller for 4 entities → bloated | Split: Producto, Categoria, Marca, Proveedor per entity |

## Data Flow

```
POST /sales  ──→ pos-ventas.service.createSale()
  QueryRunner.beginTransaction()
  SELECT ... FROM product_stock FOR UPDATE (per item)
  Validate stock ≥ quantity for ALL items
  UPDATE product_stock SET quantity = quantity - X
  INSERT stock_movements (OUT, reference=sale_id)
  INSERT sale + sale_items
  INSERT payments
  UPDATE tenant_sequences SET last_number+1 RETURNING
  INSERT invoice (with returned number)
  QueryRunner.commitTransaction()  OR  rollback on ANY error
```

## File Changes

### New (57 files)

| File | Action |
|------|--------|
| `entities/{category,brand,supplier,product,customer,product-stock,stock-movement,cash-session,cash-movement,sale,sale-item,payment,invoice,tenant-sequence}.entity.ts` | Create (14) |
| `modules/productos/{productos.module.ts,productos.service.ts,productos.controller.ts,categorias.controller.ts,marcas.controller.ts,proveedores.controller.ts,dto/*.ts}` | Create (12) |
| `modules/clientes/{clientes.module.ts,clientes.service.ts,clientes.controller.ts,dto/*.ts}` | Create (5) |
| `modules/stock/{stock.module.ts,stock.service.ts,stock.controller.ts,dto/*.ts}` | Create (5) |
| `modules/caja/{caja.module.ts,caja.service.ts,caja.controller.ts,dto/*.ts}` | Create (6) |
| `modules/pos-ventas/{pos-ventas.module.ts,pos-ventas.service.ts,pos-ventas.controller.ts,dto/*.ts}` | Create (6) |
| `database/migrations/{003-productos,004-clientes,005-stock,006-caja,007-pos-ventas}.sql` | Create (5) |
| `database/seeds/002-transaccional.ts` | Create |

### Modified (3)

| File | Change |
|------|--------|
| `app.module.ts` | Import 5 new modules |
| `config/database.config.ts` | Register 14 new entities |
| `entities/index.ts` | Export all new entities |

## Interfaces / Contracts

```typescript
// Key DTOs for the sale flow
class CreateSaleDto {
  @IsUUID() customerId?: string;
  @ValidateNested() @IsArray() items: SaleItemDto[];
  @ValidateNested() payments: PaymentDto[];
}
class SaleItemDto {
  @IsUUID() productId: string;
  @IsPositive() quantity: number;
  @IsOptional() @IsPositive() unitPrice?: number;
}
class PaymentDto {
  @IsEnum(['cash','card','transfer']) type: string;
  @IsPositive() amount: number;
}
```

Entity shape follows existing pattern: `@PrimaryGeneratedColumn('uuid')`, `@Column({ name: 'snake_case' })`, `tenantId` with `@ManyToOne(() => Tenant)`, `@CreateDateColumn`/`@UpdateDateColumn`.

Routes follow REST convention: `GET/POST /api/{resources}`, `GET/PATCH/DELETE /api/{resources}/:id`, `POST /api/sales/:id/void`.

## Testing Strategy

~60 new tests (~10 per module). Unit: mock repos + TenantContextService via `Test.createTestingModule`. Integration: controller → service with mocked deps, verify tenant isolation. Specific coverage: concurrent stock deduction (mock lock behavior), cash session dual-open rejection, invoice sequence uniqueness.

## Migration / Rollout

1. Run 003→007 migrations sequentially (IF NOT EXISTS, RLS policies, updated_at trigger)
2. Run seed `002-transaccional.ts` (find-then-insert idempotent)
3. Register entities, import modules, deploy
4. `npx nx test api` + `npx nx build api`

Rollback: `git checkout main` + per-module `DROP TABLE ... CASCADE`.

## Open Questions

- [ ] Tax rate per product vs per category? Assumption: per product `DECIMAL(5,2)`.
- [ ] Single currency configured at tenant level vs hardcoded? Assumption: hardcoded ARS.
