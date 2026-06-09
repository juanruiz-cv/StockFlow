# Tenant Isolation Specification

## Purpose

Ensure every database operation is scoped to the authenticated tenant. No request may access data belonging to another tenant.

## Requirements

### Requirement: Tenant Extraction from JWT

The system MUST extract `tenant_id` from the JWT payload on every authenticated request before any database operation.

| ID | Priority | Description |
|----|----------|-------------|
| T1 | HIGH | JWT `tenant_id` claim extraction before DB access |
| T2 | HIGH | Reject request when JWT lacks `tenant_id` |

#### Scenario: Valid tenant extraction

- GIVEN a request with a valid JWT containing `tenant_id: "tenant-abc"`
- WHEN the request enters the middleware pipeline
- THEN the system reads `tenant_id` from the decoded token
- AND sets `app.current_tenant_id` for the request scope

#### Scenario: Missing tenant_id in JWT

- GIVEN a request with a valid JWT that has no `tenant_id` claim
- WHEN the middleware processes the request
- THEN the system MUST reject the request with HTTP 403

### Requirement: RLS Policies per Table

Every multi-tenant table MUST have a PostgreSQL Row-Level Security policy filtering by `app.current_tenant_id`.

| ID | Priority | Description |
|----|----------|-------------|
| T3 | HIGH | RLS enabled on all tenant-scoped tables |
| T4 | HIGH | SELECT/INSERT/UPDATE/DELETE policies scoped to current tenant |

#### Scenario: RLS filters cross-tenant reads

- GIVEN tenant A user sends a query listing users
- WHEN the database executes the query
- THEN only rows where `tenant_id = app.current_tenant_id` are returned
- AND tenant B users are invisible

#### Scenario: RLS blocks cross-tenant insert

- GIVEN tenant A user attempts to INSERT a row with `tenant_id = 'tenant-b'`
- WHEN the INSERT executes
- THEN the RLS policy MUST reject the write due to tenant mismatch

### Requirement: Tenant Header Propagation

The system SHOULD log the originating `tenant_id` on every request for auditability.

#### Scenario: Audit log contains tenant context

- GIVEN an authenticated request with `tenant_id: "tenant-abc"`
- WHEN the request completes
- THEN the access log includes the tenant identifier
