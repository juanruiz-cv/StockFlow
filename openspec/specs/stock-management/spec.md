# Stock Management Specification

## Purpose

Track current stock quantities per product and maintain an immutable movement ledger for all stock changes (inbound, outbound, adjustments).

## Requirements

### Requirement: Current Stock Query

The system MUST expose the current stock quantity for each product. A `product_stock` row SHALL be created automatically when the first product is created, with initial quantity zero.

#### Scenario: Query stock for product

- GIVEN a product with `product_stock.quantity = 50`
- WHEN they GET `/stock/products/:productId`
- THEN the response includes `{product_id, quantity: 50, updated_at}`

#### Scenario: Stock for non-existent product

- GIVEN a product UUID that does not exist
- WHEN they GET `/stock/products/:productId`
- THEN the response is 404 Not Found

### Requirement: Stock Movement — Inbound

The system MUST support adding stock (purchase entry, return). Each inbound movement SHALL create a `stock_movement` record with `type = 'in'`.

#### Scenario: Add stock to product

- GIVEN a product with `product_stock.quantity = 10`
- WHEN they POST `/stock/movements/in` with `{product_id, quantity: 5, reason?}`
- THEN the stock movement is recorded with `type: 'in'`
- AND `product_stock.quantity` is updated to 15

### Requirement: Stock Movement — Outbound

The system MUST support removing stock (sale, waste). Each outbound movement SHALL create a `stock_movement` record with `type = 'out'`. Quantity deduction SHALL fail if insufficient stock exists.

#### Scenario: Deduct stock — sufficient

- GIVEN `product_stock.quantity = 10`
- WHEN they POST `/stock/movements/out` with `{product_id, quantity: 3}`
- THEN `product_stock.quantity` becomes 7
- AND a movement record with `type: 'out'` is created

#### Scenario: Deduct stock — insufficient

- GIVEN `product_stock.quantity = 2`
- WHEN they POST `/stock/movements/out` with `{product_id, quantity: 5}`
- THEN the response is 409 Conflict with `"stock_insufficient"` error
- AND `product_stock.quantity` remains 2

### Requirement: Stock Adjustment

The system MUST support manual adjustment (inventory count correction) with `type = 'adjust'`. Adjustment SHALL set a new absolute quantity and record the previous and new values.

#### Scenario: Adjust stock quantity

- GIVEN `product_stock.quantity = 10` and physical count shows 8
- WHEN they POST `/stock/movements/adjust` with `{product_id, new_quantity: 8, reason}`
- THEN `product_stock.quantity` becomes 8
- AND the movement records `previous: 10, new: 8`

### Requirement: Concurrency Guard

Stock deductions SHALL use row-level locking (`SELECT ... FOR UPDATE`) within a TypeORM QueryRunner transaction to prevent oversell under concurrent requests.

#### Scenario: Concurrent deductions — one fails

- GIVEN `product_stock.quantity = 1`
- WHEN two concurrent outbound requests deduct 1 each
- THEN one succeeds (quantity becomes 0)
- AND the other fails with "stock_insufficient"

### Requirement: Tenant Isolation

All stock data SHALL be scoped to the tenant. Product stock queries and movements MUST filter by the product's `tenant_id`.
