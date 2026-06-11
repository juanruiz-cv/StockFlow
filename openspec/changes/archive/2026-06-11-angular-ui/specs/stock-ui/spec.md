# Stock UI Specification

## Purpose

Provide Angular UIs for viewing current stock levels, listing stock movements, and creating inbound, outbound, and adjustment transactions.

## Requirements

### Requirement: Current Stock View

The system MUST display the current stock level for each product in a paginated table.

| ID | Priority | Description |
|----|----------|-------------|
| S1 | HIGH | Table columns: product name, SKU, current quantity, last movement date |
| S2 | HIGH | Server-side search by product name or SKU |
| S3 | MEDIUM | Stock below configurable threshold is highlighted in red |

#### Scenario: Stock view shows quantities

- GIVEN products with stock levels 10 and 0
- WHEN the stock page loads
- THEN the table shows current quantity for each product
- AND products with quantity ≤ threshold are highlighted

### Requirement: Stock Movement List

The system MUST display a paginated list of stock movements with type, product, user, quantity, and date.

#### Scenario: Movement list filtered by type

- GIVEN inbound and outbound movements
- WHEN the user selects filter "inbound"
- THEN only inbound movements are shown

### Requirement: Inbound/Outbound/Adjust Forms

The system MUST provide Reactive Forms for inbound, outbound, and stock adjustment transactions. The product selector SHALL reuse the product search component.

#### Scenario: Inbound increases stock

- GIVEN the inbound form with product selected and quantity 5
- WHEN submitted
- THEN a POST request is sent with `{type: "inbound", product_id, quantity: 5}`
- AND the stock view updates to reflect the increase

#### Scenario: Outbound with insufficient stock blocked

- GIVEN a product with current stock 2
- WHEN the user submits an outbound form with quantity 10
- THEN the form shows "Stock insuficiente (disponible: 2)"
- AND the request is NOT sent

#### Scenario: Adjustment allows negative/positive values

- GIVEN the adjustment form
- WHEN the user enters quantity -3 (correction)
- THEN the stock is decreased by 3
- AND the movement is recorded with reason "adjustment"
