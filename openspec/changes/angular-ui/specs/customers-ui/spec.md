# Customers UI Specification

## Purpose

Provide Angular CRUD UI for customer management with search and soft-delete support.

## Requirements

### Requirement: Customer List

The system MUST display a paginated customer list with search by name, email, or phone.

| ID | Priority | Description |
|----|----------|-------------|
| C1 | HIGH | Table columns: name, email, phone, createdAt |
| C2 | HIGH | Server-side search with 300ms debounce |
| C3 | MEDIUM | Soft-deleted customers are hidden by default; toggle to show them |

#### Scenario: Default list loads active customers

- GIVEN 10 active and 3 soft-deleted customers
- WHEN the customers page loads
- THEN only 10 active customers are displayed

#### Scenario: Search by email

- GIVEN customers "john@mail.com" and "jane@mail.com"
- WHEN the user types "john" in the search field
- THEN only "john@mail.com" appears after debounce

### Requirement: Customer Create/Edit Form

The system MUST provide a Reactive Form for creating and editing customers.

#### Scenario: Create customer

- GIVEN the customer form with valid data (name, email, phone)
- WHEN submitted
- THEN a POST request is sent to `/customers`
- AND the user is redirected to the customer list
- AND the new customer appears in the table

#### Scenario: Edit customer pre-fills form

- GIVEN an existing customer with name "Old Name"
- WHEN the user clicks "Edit" and the form opens
- THEN the name field is pre-filled with "Old Name"
- AND on save, a PATCH request updates the record

### Requirement: Customer Soft-Delete

The system MUST support soft-deleting a customer with confirmation.

#### Scenario: Delete shows confirmation dialog

- GIVEN an active customer
- WHEN the user clicks "Delete"
- THEN a confirmation dialog "¿Eliminar cliente?" is shown
- AND on confirmation, the customer is soft-deleted (hidden from default list)

#### Scenario: Restore from deleted

- GIVEN a soft-deleted customer shown via the "show deleted" toggle
- WHEN the user clicks "Restore"
- THEN the customer is restored and visible in the default list
