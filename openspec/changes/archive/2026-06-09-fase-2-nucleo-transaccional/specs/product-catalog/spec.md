# Product Catalog Specification

## Purpose

Manage the product catalog — Categories, Brands, Suppliers, and Products — with full tenant isolation. Each tenant sees only their own catalog data.

## Requirements

### Requirement: Category Management

The system MUST support CRUD operations for product categories scoped to the authenticated tenant.

#### Scenario: Create category

- GIVEN an authenticated tenant user with `products:write` permission
- WHEN they POST `/categories` with `{name, description?}`
- THEN a new category is created with `tenant_id` from the JWT claim
- AND the response includes the created category with a generated UUID id

#### Scenario: List categories (empty)

- GIVEN a tenant with no categories created
- WHEN they GET `/categories`
- THEN the response is an empty array

### Requirement: Brand Management

The system MUST support CRUD operations for brands scoped to the authenticated tenant.

#### Scenario: Update brand

- GIVEN an existing brand owned by the tenant
- WHEN they PATCH `/brands/:id` with `{name}`
- THEN the brand name is updated and `updated_at` is refreshed

### Requirement: Supplier Management

The system MUST support CRUD operations for suppliers scoped to the authenticated tenant.

#### Scenario: Delete supplier with products

- GIVEN a supplier that has associated products
- WHEN they DELETE `/suppliers/:id`
- THEN the response is 409 Conflict

### Requirement: Product Management

The system MUST support CRUD operations for products. Each product SHALL reference exactly one category, one brand, and optionally one supplier.

#### Scenario: Create product

- GIVEN existing category, brand, and supplier in the same tenant
- WHEN they POST `/products` with `{name, price, cost?, category_id, brand_id, supplier_id?, sku?}`
- THEN the product is created with `tenant_id` from JWT
- AND price/cost are stored as `DECIMAL(12,2)`

#### Scenario: Create product with duplicate SKU

- GIVEN an existing product with SKU `ABC-123` in the same tenant
- WHEN they POST `/products` with `{sku: "ABC-123"}`
- THEN the response is 409 Conflict

### Requirement: Tenant Isolation

All catalog queries MUST scope results to `tenant_id` extracted from the authenticated JWT. Cross-tenant data MUST NOT be visible.

#### Scenario: Cross-tenant isolation

- GIVEN Tenant A has a product named "Widget" and Tenant B has none
- WHEN Tenant B's user GETs `/products`
- THEN the response does NOT include Tenant A's "Widget"
