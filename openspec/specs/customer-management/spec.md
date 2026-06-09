# Customer Management Specification

## Purpose

Manage customers (clients) with tenant isolation — CRUD operations scoped to each tenant's customer base.

## Requirements

### Requirement: Customer CRUD

The system MUST support Create, Read, Update, and Delete operations for customers. Each customer SHALL belong to exactly one tenant.

#### Scenario: Create customer

- GIVEN an authenticated tenant user with `customers:write` permission
- WHEN they POST `/customers` with `{name, email?, phone?, address?, tax_id?}`
- THEN a new customer is created with `tenant_id` from the JWT claim
- AND the response includes the generated UUID id

#### Scenario: List customers with search

- GIVEN the tenant has 10 customers
- WHEN they GET `/customers?search=Juan&page=1&limit=5`
- THEN the response contains up to 5 matching customers where name or email contains "Juan"
- AND the response includes `total` count and `page` metadata

#### Scenario: Get non-existent customer

- GIVEN a random UUID that does not match any customer in the tenant
- WHEN they GET `/customers/:id`
- THEN the response is 404 Not Found

#### Scenario: Delete customer

- GIVEN an existing customer owned by the tenant
- WHEN they DELETE `/customers/:id`
- THEN the customer is soft-deleted (has `deleted_at` timestamp)
- AND subsequent GET requests return 404 for that id

### Requirement: Tenant Isolation

Customer data MUST be fully scoped to the authenticated tenant. Queries, inserts, updates, and deletes SHALL filter by `tenant_id`.

#### Scenario: Cross-tenant delete

- GIVEN a customer UUID that belongs to Tenant A
- WHEN Tenant B's user sends DELETE `/customers/:id` with that UUID
- THEN the response is 404 Not Found (as if the customer does not exist)

### Requirement: Customer Uniqueness

The system SHOULD prevent duplicate customer registration by email within the same tenant. Duplicate email SHALL return 409 Conflict.

#### Scenario: Duplicate email within tenant

- GIVEN an existing customer with email "juan@example.com" in the same tenant
- WHEN they POST `/customers` with the same email
- THEN the response is 409 Conflict
