# Cash Register Specification

## Purpose

Manage cash sessions (open/close) and record cash movements (ingresos/egresos) during a POS shift. Enforces at most one open session per tenant at any time.

## Requirements

### Requirement: Open Cash Session

The system MUST allow opening a cash session with an initial starting amount. The session SHALL be associated with the authenticated user and tenant.

#### Scenario: Open session successfully

- GIVEN no open cash session exists for the tenant
- WHEN they POST `/cash-register/sessions/open` with `{starting_amount: 500.00}`
- THEN a new session is created with `opened_at` timestamp
- AND the response includes the session id and `status: 'open'`

#### Scenario: Open session when one is already open

- GIVEN an existing open session for the tenant
- WHEN they POST `/cash-register/sessions/open`
- THEN the response is 409 Conflict with `"session_already_open"` error

### Requirement: Close Cash Session

The system MUST allow closing an open session. The closing request SHALL include the counted ending amount for reconciliation.

#### Scenario: Close session with reconciliation

- GIVEN an open session with `starting_amount: 500.00`
- AND recorded cash movements total +200.00 (expected balance: 700.00)
- WHEN they POST `/cash-register/sessions/:id/close` with `{counted_amount: 700.00}`
- THEN the session is closed with `closed_at` timestamp
- AND the response includes `expected_amount: 700.00`, `counted_amount: 700.00`, `difference: 0.00`

#### Scenario: Close with discrepancy

- GIVEN the same session with expected 700.00
- WHEN they close with `{counted_amount: 680.00}`
- THEN the session is closed
- AND `difference` is recorded as -20.00

### Requirement: Cash Movement Recording

The system MUST record cash movements (ingresos/egresos) within a session. Each movement SHALL have a type (`in`/`out`), amount, reason, and reference to the open session.

#### Scenario: Record cash ingress

- GIVEN an open session for the tenant
- WHEN they POST `/cash-register/sessions/:id/movements` with `{type: 'in', amount: 100.00, reason: 'extra cash deposit'}`
- THEN a movement is recorded linked to the session
- AND the session's running balance increases by 100.00

#### Scenario: Movement when session is closed

- GIVEN a session that is already closed
- WHEN they POST `/cash-register/sessions/:id/movements`
- THEN the response is 422 Unprocessable Entity with `"session_closed"` error

### Requirement: One Open Session Enforced

The system MUST enforce at most one open session per tenant at any time via a partial unique index on `(tenant_id)` WHERE `closed_at IS NULL`.

#### Scenario: Second session blocked

- GIVEN Tenant A has an open session
- WHEN Tenant A tries to open another session
- THEN the database constraint rejects the insert
- AND the API returns 409 Conflict
