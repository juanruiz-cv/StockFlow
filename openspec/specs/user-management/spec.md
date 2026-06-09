# User Management Specification

## Purpose

Allow tenant-scoped CRUD operations on users. Passwords are hashed with bcrypt. RLS ensures tenant isolation — users in tenant A never see users in tenant B.

## Requirements

### Requirement: Tenant-Scoped User CRUD

The system MUST allow admin users to create, read, update, and deactivate users within their own tenant. Cross-tenant operations MUST be blocked by RLS.

| ID | Priority | Description |
|----|----------|-------------|
| U1 | HIGH | Admin creates user in own tenant with email + password |
| U2 | HIGH | Admin lists all users scoped to own tenant only |
| U3 | HIGH | Admin updates user details within own tenant |
| U4 | HIGH | Admin deactivates user within own tenant |
| U5 | HIGH | Cross-tenant user reads return empty result via RLS |

#### Scenario: Admin creates user in own tenant

- GIVEN an authenticated admin with `tenant_id: "tenant-abc"`
- WHEN a POST request is sent to `/users` with `{ email, password, name }`
- THEN the system creates a user with `tenant_id = "tenant-abc"`
- AND returns HTTP 201 with the new user profile (without the password)

#### Scenario: Cross-tenant isolation

- GIVEN tenant A admin lists users
- WHEN tenant B admin lists users at the same time
- THEN tenant A sees only users with `tenant_id = "tenant-a"`
- AND tenant B sees only users with `tenant_id = "tenant-b"`

#### Scenario: Create user with duplicate email in same tenant

- GIVEN an existing user with email `user@store.com` in tenant A
- WHEN an admin in tenant A tries to create another user with the same email
- THEN the system returns HTTP 409 with a conflict error

### Requirement: Password Hashing

The system MUST hash all user passwords with bcrypt before persisting. Passwords MUST NEVER be stored or returned in plain text.

#### Scenario: Password is hashed on creation

- GIVEN a POST request to `/users` with `password: "secure123"`
- WHEN the user is persisted
- THEN the stored password is a bcrypt hash, not plain text
- AND the response body excludes the password field

### Requirement: User Deactivation

The system SHOULD support deactivating users (soft-delete or status flag) rather than hard-deleting, to preserve referential integrity.

#### Scenario: Deactivated user cannot log in

- GIVEN a user with `active: false` status
- WHEN the user attempts to log in with correct credentials
- THEN the system returns HTTP 401 with "account deactivated" error
