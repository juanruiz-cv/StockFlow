# Delta for auth-jwt

## MODIFIED Requirements

### Requirement: Email/Password Login

The system MUST accept email and password credentials and return a signed JWT and a refresh token on success. (Previously: login returned JWT only)

| ID | Priority | Description |
|----|----------|-------------|
| A1 | HIGH | POST /auth/login validates credentials and returns JWT + refreshToken |
| A2 | HIGH | Passwords are verified against stored bcrypt hash |

#### Scenario: Successful login

- GIVEN a registered user with email `admin@store.com` and correct password
- WHEN a POST request is sent to `/auth/login` with these credentials
- THEN the system returns HTTP 200 with a JWT containing `sub`, `tenant_id`, and `roles` claims
- AND the response includes a `refresh_token` field containing an opaque UUID

#### Scenario: Invalid credentials

- GIVEN a registered user with email `admin@store.com`
- WHEN a POST request is sent to `/auth/login` with a wrong password
- THEN the system returns HTTP 401 with an authentication error message

## ADDED Requirements

### Requirement: Refresh Token Entity

The system MUST store refresh tokens as opaque UUIDs, hashed with SHA-256, in a `refresh_tokens` table with `family_id`, `is_used`, and `expires_at` columns.

#### Scenario: Token stored with family metadata

- GIVEN a successfully authenticated user
- WHEN the system issues a refresh token
- THEN the hash, `user_id`, `tenant_id`, `family_id`, `is_used: false`, and `expires_at` (7-day TTL) are persisted

### Requirement: Token Refresh Endpoint

The system MUST expose `POST /auth/refresh` accepting `{ refresh_token }` and returning new `access_token` and `refresh_token` on success. The old token SHALL be marked as used; the new token SHALL belong to the same family.

#### Scenario: Successful refresh with rotation

- GIVEN a valid unused refresh token with family_id `f-1`
- WHEN a POST request is sent to `/auth/refresh` with that token
- THEN HTTP 200 is returned with a new JWT and a new opaque refresh token sharing `family_id` `f-1`
- AND the old refresh token is marked `is_used: true`

#### Scenario: Expired refresh token rejected

- GIVEN a refresh token past its 7-day TTL
- WHEN a POST request is sent to `/auth/refresh` with that token
- THEN the system returns HTTP 401 with "refresh token expired"

### Requirement: Theft Detection and Family Revocation

If a refresh token already marked as `is_used` is presented, the system MUST revoke ALL refresh tokens in that family and return HTTP 409 Conflict.

#### Scenario: Reused token triggers family revocation

- GIVEN a refresh token that was already consumed in a previous refresh
- WHEN a POST request is sent to `/auth/refresh` with that used token
- THEN the system returns HTTP 409 Conflict
- AND ALL tokens sharing that `family_id` are deleted (revoked)
- AND the user must re-login to obtain new tokens
