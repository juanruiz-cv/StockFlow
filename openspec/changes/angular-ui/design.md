# Design: Angular UI — StockFlow Frontend

## Technical Approach

Greenfield Angular 20 SPA built as 7 sequential PRs. Standalone components, zoneless CD, Signals per feature, HttpClient + toSignal, Reactive Forms, Tailwind CSS 4, Angular CDK for primitives (table, overlay, a11y). Auth via JWT with refresh rotation queue. Lazy-loaded feature modules via `loadChildren`. Permission-based UI driven by JWT claims.

Stack decisions per proposal: Angular 20.3 standalone, Tailwind 4 (CSS-first), CDK (no Material), Signals (no NgRx), zoneless, no `.component`/`.service` suffix.

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|
| **Auth flow** | Login → store tokens in localStorage → HttpInterceptor adds Bearer → 401 queue refreshes → retry | HttpOnly cookies if same-origin, refresh per-request | localStorage is simple, JWT rotation queue prevents race conditions on concurrent 401s. API is on different origin in dev |
| **App shell** | Sidebar layout with router-outlet, responsive collapsible sidebar | Top nav, tab-based nav | Sidebar matches stock/ERP conventions. Collapsible for mobile. CSS Grid layout with CDK overlay for mobile drawer |
| **Feature structure** | `features/{name}/` with page, form, service, models | Shared modules, barrel-only | Flat per-feature for independent lazy loading. Clear ownership. No NgModule wrappers |
| **Shared components** | Table (sortable+paginated), SearchInput, ConfirmDialog, Modal, Toast in `shared/ui/` | CDK Table only, standalone lib | CDK Table for sort/paginate logic. Toast via CDK overlay. These are the 5 cross-cutting patterns across all features |
| **Route design** | `/login` (public), `/dashboard`, `/products`, `/customers`, `/stock`, `/caja`, `/sales`, `/admin/users`, `/admin/roles` | Nested child routes only | Flat top-level routes. Admin is the only nested group. `canActivate` guard on all private routes |
| **API layer** | `BaseApiService` with typed GET/POST/PUT/DELETE, feature services extend | Direct HttpClient per component, NestJS SDK | Typed base reduces boilerplate. Extending keeps feature concerns isolated. Uses `HttpClient` + `toSignal` |
| **Error handling** | Global HTTP interceptor → Toast notification via service | Route-level error handling | DRY. Interceptor catches 4xx/5xx, maps to user-facing messages, pushes to ToastService. Auth interceptor handles 401 separately |
| **Permission UI** | Show/hide menu + buttons from JWT `roles` claims + `PermissionResource`/`PermissionAction` enums | Separate `/me` endpoint, route data guards | JWT already has roles. Sync `canActivate` with permission check. Directive `*appCan="['products.create']"` for element-level. Roles change only on re-login (acceptable for this app) |

## Data Flow

### Login Flow

```
LoginPage
  │ submit(email, password)
  ▼
AuthService.login()
  │ POST /auth/login
  ▼
API → { access_token, refresh_token }
  │
  ├─ localStorage.set('access_token')
  └─ localStorage.set('refresh_token')
       │
       ▼
  Router.navigate(['/dashboard'])
  AuthService.setUser(jwtDecode(token))
```

### API Call Flow (normal)

```
Component
  │ toSignal(service.getAll())
  ▼
FeatureService
  │ this.http.get('/api/products')
  ▼
HttpInterceptor
  │ set 'Authorization: Bearer <token>'
  ▼
API → response
  │
  ▼
Component → signal updates → template re-renders
```

### Token Refresh Flow (401 race)

```
3 concurrent requests → 401 on each
         │
         ▼
AuthInterceptor: first 401 triggers refresh
         │ POST /auth/refresh { refresh_token }
  ┌──────┘
  │ refresh succeeds → store new tokens
  │
  ▼
Queued requests retry with new token
  └── refresh fails → clear tokens → redirect /login
```

## File Structure

```
apps/web/src/app/
├── app.config.ts              # provideHttpClient, provideRouter, zoneless
├── app.component.ts           # Router outlet (shell mounted via router)
├── app.routes.ts              # Top-level route config
│
├── auth/
│   ├── auth.service.ts
│   ├── login.page.ts
│   ├── auth.interceptor.ts
│   ├── auth.guard.ts
│   ├── token.service.ts
│   └── models.ts
│
├── features/
│   ├── dashboard/
│   │   └── dashboard.page.ts
│   ├── products/
│   │   ├── product-list.page.ts
│   │   ├── product-form.page.ts
│   │   ├── product.service.ts
│   │   └── models.ts
│   ├── customers/
│   │   ├── customer-list.page.ts
│   │   ├── customer-form.page.ts
│   │   ├── customer.service.ts
│   │   └── models.ts
│   ├── stock/
│   │   ├── stock.page.ts
│   │   ├── movement-list.page.ts
│   │   ├── movement-form.page.ts
│   │   ├── stock.service.ts
│   │   └── models.ts
│   ├── caja/
│   │   ├── session.page.ts
│   │   ├── movement-list.page.ts
│   │   ├── caja.service.ts
│   │   └── models.ts
│   ├── sales/
│   │   ├── pos.page.ts
│   │   ├── sale-history.page.ts
│   │   └── sale.service.ts
│   └── admin/
│       ├── user-list.page.ts
│       ├── user-form.page.ts
│       ├── role-list.page.ts
│       ├── role-form.page.ts
│       ├── admin.service.ts
│       └── models.ts
│
├── layout/
│   ├── sidebar.ts
│   ├── sidebar-item.ts
│   └── page-shell.ts
│
├── shared/
│   └── ui/
│       ├── table.ts
│       ├── search-input.ts
│       ├── confirm-dialog.ts
│       ├── modal.ts
│       └── toast.ts
│
└── environments/
    └── environment.ts          # API_BASE_URL
```

## File Changes

### PR 1 — Foundation
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/app.config.ts` | Modify | Add `provideHttpClient`, `provideRouter`, zoneless, interceptors |
| `apps/web/src/app.routes.ts` | Create | Lazy route definitions |
| `apps/web/src/auth/*` | Create | 6 files: service, login page, interceptor, guard, token service, models |
| `apps/web/src/layout/*` | Create | 3 files: sidebar, sidebar-item, page-shell |
| `apps/web/src/features/dashboard/*` | Create | Dashboard landing page |
| `apps/web/src/environments/environment.ts` | Create | API base URL |
| `apps/web/src/styles.css` | Modify | Add `@import "tailwindcss"` |

### PR 2 — Products
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/products/*` | Create | 4 files: list, form, service, models |
| `apps/web/src/shared/ui/table.ts` | Create | Sortable/paginated table |
| `apps/web/src/shared/ui/search-input.ts` | Create | Debounced search |
| `apps/web/src/shared/ui/page-shell.ts` | Create | Breadcrumb + title |

### PR 3 — Customers
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/customers/*` | Create | 4 files |

### PR 4 — Stock
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/stock/*` | Create | 5 files |

### PR 5 — Caja
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/caja/*` | Create | 4 files |

### PR 6 — POS
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/sales/*` | Create | 3 files |
| `apps/web/src/shared/ui/modal.ts` | Create | CDK overlay modal |
| `apps/web/src/shared/ui/confirm-dialog.ts` | Create | Confirmation overlay |
| `apps/web/src/shared/ui/toast.ts` | Create | Toast notification |

### PR 7 — Admin
| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/features/admin/*` | Create | 6 files |

## Interfaces / Contracts

```typescript
// apps/web/src/auth/models.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UserSession {
  sub: string;
  email: string;
  tenant_id: string;
  roles: string[];
}

// apps/web/src/shared/ui/table.ts
export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  format?: (value: unknown) => string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface TableState {
  sortColumn: string;
  sortDir: 'asc' | 'desc';
  search: string;
  page: number;
}
```

Types from `libs/shared` — `JwtPayload`, `PermissionResource`, `PermissionAction`, `SystemPermission` — reused directly.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Auth service, token service, guards | Jest — mock HttpClient, test token store, guard return values |
| Unit | Feature services | Jest — mock BaseApiService, verify HTTP params |
| Unit | Shared components (table, search) | Jest — input signals, output events |
| Integration | Login flow | Angular TestBed — wire interceptor + guard + router together |
| E2E | Not in scope | Proposal explicitly excludes E2E |

## Migration / Rollout

No data migration. Each PR is independently mergeable. Auth revert forces re-login — notify if rolling back PR1.

## PR Ordering & Dependencies

```
PR1 (Foundation) ──→ PR2 (Products) ──→ PR4 (Stock)
                  │                     └── depends on product selector from PR2
                  ├──→ PR3 (Customers)
                  ├──→ PR5 (Caja)
                  └──→ PR6 (POS) ── depends on PR2-5
                  └──→ PR7 (Admin) ── independent, merges any time after PR1
```

PRs 3, 5, 7 have no cross-dependencies and can be parallelized.

## Open Questions

- [ ] Confirm API snake_case→camelCase convention: interceptor or HTTP-only?
- [ ] Confirm refresh token endpoint path (`/auth/refresh` assumed)
- [ ] Confirm permission model — role names in JWT vs explicit permission list
