# Auth JWT Specification

## Purpose

Provide secure authentication via email/password login, issuing signed JWTs with tenant and role claims. Every protected endpoint validates the token before access.

## Requirements

### Requirement: Email/Password Login

The system MUST accept email and password credentials and return a signed JWT on success.

| ID | Priority | Description |
|----|----------|-------------|
| A1 | HIGH | POST /auth/login validates credentials and returns JWT |
| A2 | HIGH | Passwords are verified against stored bcrypt hash |

#### Scenario: Successful login

- GIVEN a registered user with email `admin@store.com` and correct password
- WHEN a POST request is sent to `/auth/login` with these credentials
- THEN the system returns HTTP 200 with a JWT containing `sub`, `tenant_id`, and `roles` claims

#### Scenario: Invalid credentials

- GIVEN a registered user with email `admin@store.com`
- WHEN a POST request is sent to `/auth/login` with a wrong password
- THEN the system returns HTTP 401 with an authentication error message

### Requirement: JWT Token Structure

The issued JWT MUST contain `sub` (user ID), `tenant_id`, and `roles` claims. It MUST use `@nestjs/jwt` signing with configurable secret and expiry.

#### Scenario: JWT carries required claims

- GIVEN a successfully authenticated user
- WHEN the system issues a JWT
- THEN the decoded token includes `sub`, `tenant_id`, and `roles`
- AND the token has an `exp` claim not exceeding the configured TTL

### Requirement: Authenticated User Info

The system MUST expose `GET /auth/me` returning the current authenticated user's profile from the JWT.

| ID | Priority | Description |
|----|----------|-------------|
| A3 | HIGH | GET /auth/me returns user profile for valid token |
| A4 | HIGH | GET /auth/me rejects expired or malformed tokens |

#### Scenario: Retrieve authenticated user

- GIVEN a valid JWT for user with ID `user-42`
- WHEN a GET request is sent to `/auth/me` with the JWT in the Authorization header
- THEN the system returns HTTP 200 with the user's profile (id, email, roles, tenant_id)

#### Scenario: Expired token

- GIVEN an expired JWT
- WHEN a GET request is sent to `/auth/me` with the expired token
- THEN the system returns HTTP 401 with "token expired" error

### Requirement: JwtAuthGuard

The system SHALL provide a reusable `JwtAuthGuard` that protects any route or controller by validating the Bearer token from the Authorization header.

#### Scenario: Guard rejects missing token

- GIVEN a protected route `/users`
- WHEN a request is sent without an Authorization header
- THEN the `JwtAuthGuard` rejects the request with HTTP 401
