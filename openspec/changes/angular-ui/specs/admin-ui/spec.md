# Admin UI Specification

## Purpose

Provide Angular UIs for user management and role/permission administration within the tenant scope.

## Requirements

### Requirement: User Management

The system MUST provide a paginated user list with CRUD forms, scoped to the authenticated tenant.

| ID | Priority | Description |
|----|----------|-------------|
| A1 | HIGH | Table columns: name, email, roles, active status |
| A2 | HIGH | Server-side search by name or email |
| A3 | HIGH | Create/edit form includes name, email, password, role assignment |
| A4 | MEDIUM | User can be deactivated (soft) without deleting |

#### Scenario: User list scoped to tenant

- GIVEN a tenant with 5 users
- WHEN the admin loads the users page
- THEN only those 5 users are displayed

#### Scenario: Create user with role assignment

- GIVEN the user creation form
- WHEN the user enters name, email, password, and selects "Vendedor" role
- AND submits
- THEN a POST request is sent to `/users` with those fields
- AND the new user appears in the list

#### Scenario: Deactivate user

- GIVEN an active user
- WHEN the admin clicks "Desactivar" and confirms
- THEN the user is deactivated (is_active: false)
- AND the user can no longer log in

### Requirement: Role and Permission Management

The system MUST provide a page to view roles and assign permissions to each role.

#### Scenario: View role permissions

- GIVEN a role "Vendedor" with `sales.create` and `sales.read` permissions
- WHEN the admin views the role detail page
- THEN the assigned permissions are shown as checked boxes
- AND unassigned permissions are shown unchecked

#### Scenario: Toggle permission on role

- GIVEN the role "Vendedor" without `products.read`
- WHEN the admin checks `products.read` and saves
- THEN a PATCH request is sent to `/roles/:id`
- AND the role now has that permission

### Requirement: Permission Guard (UI)

The system SHOULD provide a directive or structural guard that hides UI elements based on the current user's permissions.

#### Scenario: Button hidden without permission

- GIVEN a user with no `products.delete` permission
- WHEN viewing the products page
- THEN the "Delete" button is not rendered
