# Sales POS Specification

## Purpose

Process point-of-sale transactions: create sales with line items, process payments (cash/card/transfer), deduct stock, and generate sequential invoice numbers per tenant.

## Requirements

### Requirement: Create Sale

The system MUST support creating a sale with one or more line items. Each line item SHALL reference a product, quantity, and unit price. The sale SHALL be associated with a customer (optional) and the authenticated tenant.

#### Scenario: Create sale successfully

- GIVEN products with sufficient stock (Widget qty: 10, Gadget qty: 5)
- AND an open cash session for the tenant
- WHEN they POST `/sales` with `{customer_id?, items: [{product_id, quantity: 2}, {product_id, quantity: 1}], payments: [{method: 'cash', amount: 150.00}]}`
- THEN a sale is created with `status: 'completed'`
- AND line items record product, quantity, unit_price, subtotal
- AND stock is deducted (Widget: 10→8, Gadget: 5→4)
- AND a sequential invoice number is generated

### Requirement: Stock Deduction at Sale

Stock deduction SHALL happen atomically within the sale transaction. If any line item exceeds available stock, the ENTIRE sale SHALL roll back.

#### Scenario: Partial stock — sale rollback

- GIVEN Widget qty: 2, Gadget qty: 0
- WHEN they POST `/sales` with items requesting 1 Widget and 1 Gadget
- THEN the response is 409 Conflict with `"stock_insufficient"` error referencing Gadget
- AND no sale is created
- AND Widget stock remains 2 (not deducted)

### Requirement: Payment Processing

The sale MUST include at least one payment method. Supported methods: `cash`, `card`, `transfer`. The sum of payments MUST equal the total sale amount.

#### Scenario: Single payment — cash

- GIVEN a sale total of 100.00
- WHEN they POST with `payments: [{method: 'cash', amount: 100.00}]`
- THEN the sale is completed with `payment_status: 'paid'`

#### Scenario: Split payment

- GIVEN a sale total of 200.00
- WHEN they POST with `payments: [{method: 'cash', amount: 100.00}, {method: 'card', amount: 100.00}]`
- THEN the sale is completed
- AND both payments are recorded

#### Scenario: Payment mismatch

- GIVEN a sale total of 100.00
- WHEN they POST with `payments: [{method: 'cash', amount: 80.00}]`
- THEN the response is 422 Unprocessable Entity with `"payment_mismatch"` error

### Requirement: Invoice Number Generation

Each completed sale SHALL receive a sequential invoice number generated via a tenant-scoped sequence (`tenant_sequences` table). The sequence SHALL be atomically incremented using `UPDATE ... RETURNING next_val`.

#### Scenario: Sequential invoice numbers

- GIVEN Tenant A's sequence is at 100
- WHEN two sales are completed sequentially
- THEN the first sale receives invoice `INV-000101`
- AND the second receives `INV-000102`

### Requirement: Tenant Isolation

All sales, line items, payments, and invoice sequences SHALL be scoped to the authenticated tenant. Cross-tenant data MUST NOT be accessible.
