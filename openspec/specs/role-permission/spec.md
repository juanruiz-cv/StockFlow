# Role & Permission Specification

## Purpose

Provide role-based access control (RBAC) with fine-grained permissions. Admins define roles, assign permissions, and map users to roles. A `PermissionsGuard` enforces access per endpoint.

## Requirements

### Requirement: Role CRUD

The system MUST allow admin users to create, list, update, and delete roles scoped to their tenant.

| ID | Priority | Description |
|----|----------|-------------|
| R1 | HIGH | Admin creates role with name and description |
| R2 | HIGH | Admin lists roles scoped to own tenant |
| R3 | HIGH | Admin updates role metadata |
| R4 | HIGH | Admin deletes role (unless assigned to users) |

#### Scenario: Admin creates role

- GIVEN an authenticated admin in tenant A
- WHEN a POST request is sent to `/roles` with `{ name: "Supervisor", description: "Can oversee operations" }`
- THEN the system creates the role scoped to tenant A
- AND returns HTTP 201

#### Scenario: Delete role with active assignments

- GIVEN a role "Supervisor" currently assigned to 3 users
- WHEN an admin sends DELETE to `/roles/supervisor-id`
- THEN the system returns HTTP 409 with "role has active assignments" error

### Requirement: Permission CRUD

The system MUST allow listing available permissions. Permission creation SHOULD be available to system-level configuration or seed data.

#### Scenario: List available permissions

- GIVEN a seeded set of permissions (`users.read`, `users.write`, `products.read`, etc.)
- WHEN a GET request is sent to `/permissions`
- THEN the system returns all system-defined permissions

### Requirement: User-Role Assignment

The system MUST allow assigning and removing roles for users within the same tenant.

| ID | Priority | Description |
|----|----------|-------------|
| R5 | HIGH | Admin assigns role to user in own tenant |
| R6 | HIGH | Admin removes role from user in own tenant |

#### Scenario: Assign role to user

- GIVEN an admin in tenant A, a user `user-42` in tenant A, and a role "Admin"
- WHEN a POST request is sent to `/users/user-42/roles` with `{ roleId: "admin-role-id" }`
- THEN the user `user-42` is associated with the Admin role
- AND the user's JWT now includes "Admin" in its roles claim on next login

### Requirement: PermissionsGuard

The system SHALL provide a `@RequirePermission(permission)` decorator and `PermissionsGuard` that checks the authenticated user's roles contain the required permission before executing the route handler.

#### Scenario: Guard grants access

- GIVEN an authenticated user with role "Admin" which includes `users.write`
- WHEN a POST request is sent to `/users` decorated with `@RequirePermission('users.write')`
- THEN the guard validates the permission and allows the request

#### Scenario: Guard denies insufficient permissions

- GIVEN an authenticated user with role "Stock" which only includes `products.read`
- WHEN a POST request is sent to `/users` decorated with `@RequirePermission('users.write')`
- THEN the guard rejects the request with HTTP 403

### Requirement: Seed Roles

The system MUST seed three initial roles on first migration: **Admin** (all permissions), **Vendedor** (sales-related permissions), and **Stock** (inventory-related permissions).

#### Scenario: Seed roles exist after migration

- GIVEN a fresh database migration
- WHEN the system starts for the first time
- THEN the `roles` table contains "Admin", "Vendedor", and "Stock" entries with their respective permission sets
