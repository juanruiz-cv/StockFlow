# Caja UI Specification

## Purpose

Provide Angular UIs for cash register session management — opening/closing sessions and listing cash movements.

## Requirements

### Requirement: Cash Session Status

The system MUST display the current cash session status at the top of the cash register page showing open/closed state, opening balance, and current balance.

| ID | Priority | Description |
|----|----------|-------------|
| J1 | HIGH | Session status bar shows: state (open/closed), opening balance, current balance |
| J2 | HIGH | Only one active session is allowed at a time |

#### Scenario: Open session displayed

- GIVEN an open cash session with opening balance $1000
- WHEN the caja page loads
- THEN the status bar shows "Sesión abierta - $1000.00"
- AND the "Open Session" button is disabled

#### Scenario: No session displays idle state

- GIVEN no active cash session
- WHEN the caja page loads
- THEN the status bar shows "Sin sesión activa"
- AND only the "Open Session" button is enabled

### Requirement: Open Session

The system MUST provide a form to open a cash session with an opening balance.

#### Scenario: Open session creates active session

- GIVEN no active session exists
- WHEN the user enters opening balance $500 and submits
- THEN a POST request is sent to `/caja/session/open`
- AND the status bar updates to show the new session

### Requirement: Close Session

The system MUST provide a close action that records the closing balance and calculated totals.

#### Scenario: Close session records final balance

- GIVEN an active session with current balance $1500
- WHEN the user enters closing balance $1480 and submits
- THEN a POST request is sent to `/caja/session/close`
- AND the session is marked closed
- AND the movent list shows the closing record

### Requirement: Cash Movement List

The system MUST display a paginated list of all cash movements for the current session with type, amount, user, and timestamp.

#### Scenario: Movements scoped to current session

- GIVEN a session with 5 inbound and 3 outbound movements
- WHEN viewing the movement list
- THEN all 8 movements are shown ordered by timestamp descending
