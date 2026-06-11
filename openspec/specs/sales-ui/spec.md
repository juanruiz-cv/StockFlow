# Sales UI Specification

## Purpose

Provide Angular POS UI for sale creation (product search, cart, payments), sale history list, and sale voiding.

## Requirements

### Requirement: POS Sale Creation

The system MUST provide a POS layout with two panels: product search (left) and cart (right).

| ID | Priority | Description |
|----|----------|-------------|
| V1 | HIGH | Product search is debounced (300ms) and searches by name or SKU |
| V2 | HIGH | Adding a product to the cart shows name, quantity, unit price, and subtotal |
| V3 | HIGH | Quantity can be adjusted in the cart |
| V4 | HIGH | Scanning a barcode (SKU) automatically adds the product |

#### Scenario: Search and add to cart

- GIVEN the POS with an empty cart
- WHEN the user types "Widget" and selects a product from results
- THEN the product is added to the cart with quantity 1
- AND the cart total updates

#### Scenario: Adjust cart quantity

- GIVEN a product in the cart with quantity 1
- WHEN the user increases quantity to 3
- THEN the subtotal updates to `unit_price × 3`
- AND the cart total recalculates

### Requirement: Payment Processing

The system MUST provide a payment button that opens a payment dialog with available methods and calculates change.

#### Scenario: Complete payment

- GIVEN a cart with total $150
- WHEN the user selects payment method "cash", enters $200, and confirms
- THEN a POST request is sent with the sale payload
- AND the response shows change of $50 and the invoice number

### Requirement: Sale History

The system MUST display a paginated list of completed sales with date, customer, total, and status.

#### Scenario: Sale history paginated

- GIVEN 25 completed sales
- WHEN the sale history page loads
- THEN the first 20 sales are shown with paginator on page 2

### Requirement: Sale Void

The system MUST allow voiding a sale within the same session with a reason.

#### Scenario: Void sale requires reason

- GIVEN a completed sale
- WHEN the user clicks "Anular" and enters reason "Cliente canceló"
- THEN the sale status changes to "voided"
- AND stock is restored for all sold items
