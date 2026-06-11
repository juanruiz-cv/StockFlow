# Products UI Specification

## Purpose

Provide Angular CRUD UIs for categories, brands, suppliers, and products with search, pagination, and form validation.

## Requirements

### Requirement: Product List

The system MUST display a paginated product list with search and sort controls.

| ID | Priority | Description |
|----|----------|-------------|
| P1 | HIGH | Table columns: name, SKU, category, brand, price, stock, status |
| P2 | HIGH | Server-side pagination (default 20 per page) |
| P3 | HIGH | Debounced search by name or SKU (300ms) |

#### Scenario: Empty state

- GIVEN no products exist
- WHEN the list page loads
- THEN an empty state message "No hay productos" is shown
- AND the paginator shows 0 of 0

#### Scenario: Search filters results

- GIVEN products "Widget A" and "Widget B"
- WHEN the user types "Widget" in the search field
- THEN the table shows only matching products after 300ms debounce

### Requirement: Product Create/Edit Form

The system MUST provide a Reactive Form for creating and editing products with validation.

#### Scenario: Create product saves to API

- GIVEN the create product form
- WHEN all required fields (name, price, category) are valid and submitted
- THEN a POST request is sent to `/products`
- AND on success, the user is redirected to the product list

#### Scenario: Duplicate SKU shows error

- GIVEN a product with SKU "ABC-123" already exists
- WHEN the user submits a new product with the same SKU
- THEN the form displays "Este SKU ya existe" next the SKU field

### Requirement: Category/Brand/Supplier Management

The system MUST provide CRUD pages for categories, brands, and suppliers with dedicated list and form views.

#### Scenario: Category creation

- GIVEN the category form with a valid name
- WHEN the user submits
- THEN the category is created and the list refreshes

#### Scenario: Delete supplier with existing products blocked

- GIVEN a supplier linked to one or more products
- WHEN the user attempts to delete that supplier
- THEN the API returns 409 Conflict
- AND the UI shows "No se puede eliminar: el proveedor tiene productos asociados"
