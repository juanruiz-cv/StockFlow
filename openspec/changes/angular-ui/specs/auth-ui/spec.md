# Auth UI Specification

## Purpose

Provide Angular login page, signals-based auth service, JWT interceptor with automatic refresh, route guard, and session management for the StockFlow frontend.

## Requirements

### Requirement: Auth Service (Session Signal)

The system MUST provide an injectable `AuthService` holding a `session` signal (`JwtPayload | null`) that reflects the current authentication state.

#### Scenario: Session initialized as null

- GIVEN a user who has not logged in
- WHEN the app initializes
- THEN `session()` is `null`

#### Scenario: Session populated on login

- GIVEN valid email and password
- WHEN `login()` resolves successfully
- THEN `session()` contains the decoded `JwtPayload`

### Requirement: Login Page

The system MUST provide a `/login` route with an email/password Reactive Form with validation.

| ID | Priority | Description |
|----|----------|-------------|
| U1 | HIGH | Email is required and must be valid format |
| U2 | HIGH | Password is required (min 6 chars) |
| U3 | HIGH | Submit button is disabled while the request is in-flight |

#### Scenario: Successful login redirects to dashboard

- GIVEN a login form with valid credentials
- WHEN the user submits and the API returns JWT + refresh token
- THEN the user is redirected to `/dashboard`

#### Scenario: Failed login shows error

- GIVEN invalid credentials
- WHEN the API returns 401
- THEN an inline error "Credenciales inválidas" is displayed
- AND the user remains on `/login`

### Requirement: JWT Interceptor

The system MUST provide an `HttpInterceptor` that attaches the Bearer token to all outgoing requests and silently refreshes on 401.

#### Scenario: Token attached to every request

- GIVEN an authenticated user with a stored JWT
- WHEN any HTTP request is made
- THEN `Authorization: Bearer <token>` is added

#### Scenario: 401 triggers refresh queue

- GIVEN an expired JWT
- WHEN a request returns 401
- THEN the interceptor queues the refresh call (concurrent 401s share one refresh)
- AND on success, retries the original request with the new token
- AND on failure, clears session and redirects to `/login`

### Requirement: Auth Guard

The system MUST provide a functional route guard that blocks unauthenticated navigation.

#### Scenario: Authenticated user passes

- GIVEN a user with `session()` populated
- WHEN navigating to `/products`
- THEN the route is activated

#### Scenario: Unauthenticated user redirected

- GIVEN a user with `session()` null
- WHEN navigating to a protected route
- THEN they are redirected to `/login`

### Requirement: Logout

The system MUST provide a `logout()` function that clears session, removes stored tokens, and navigates to `/login`.

#### Scenario: Logout resets all state

- GIVEN an authenticated user
- WHEN `logout()` is called
- THEN `session()` becomes null
- AND tokens are removed from localStorage
- AND the user is on `/login`
