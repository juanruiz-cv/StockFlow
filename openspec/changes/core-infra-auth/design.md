# Design: Core Infrastructure & Authentication (Fase 1)

## Technical Approach

Nx 21 monorepo (`--preset=apps` + `@nx/nest` + `@nx/angular`). NestJS 11 modular monolith with TypeORM + PostgreSQL 17. JWT embeds `tenant_id` for RLS-based multi-tenant isolation via AsyncLocalStorage. Four modules: auth (login/JWT), users (CRUD), roles, permissions. Angular 20 skeleton created but not developed. See specs: `tenant-isolation`, `auth-jwt`, `user-management`, `role-permission`.

## Architecture Decisions

### Workspace & Framework

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `--preset=apps` + plugins | Clean slate, manual plugin install | ✅ Chosen |
| `--preset=nest` | Brings NestJS defaults to override | ❌ |
| `--preset=angular` | Angular opinions, unused in Fase 1 | ❌ |

### Tenant Context

| Option | Tradeoff | Decision |
|--------|----------|----------|
| AsyncLocalStorage (native) | Zero deps, auto async propagation | ✅ Chosen |
| ContextIdFactory + durable providers | Overkill for simple tenant propagation | ❌ |

**Rationale**: ALS is Node.js built-in since v16, propagates through async chains automatically. Middleware wraps each request, no DI scope changes needed.

### RLS Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `SET app.current_tenant_id` + RLS policies | DB enforces last line of defense | ✅ Chosen |
| App-level WHERE `tenant_id = ?` everywhere | Manual, easy to miss a query | ❌ |

**Rationale**: RLS protects even if a query lacks WHERE. Combined with ALS for automatic `SET` per request, tenant isolation is zero-effort for module developers.

### JWT Claims

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Roles only in JWT, resolve permissions at guard | Smaller tokens, correct on permission change | ✅ Chosen |
| All permissions in JWT | Fat token, needs reissue on permission change | ❌ |

**Rationale**: Embedding permissions in JWT breaks statelessness — any permission change requires token reissue. Resolving at guard time via lightweight cache/DB lookup is more correct.

### Permission Model

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Roles group permissions, PermissionsGuard checks | Clean RBAC, fine-grained control | ✅ Chosen |
| Hardcoded role checks in controllers | Fast but brittle, violates DRY | ❌ |

## Data Flow

### Auth & RLS per Request

```
Client                  NestJS Server
  │                         │
  │ POST /auth/login        │
  │ { email, password }     │
  │ ──────────────────────→│ AuthService
  │                         │ → bcrypt.compare(password, hash)
  │                         │ → JwtService.sign({
  │                         │     sub, tenant_id, roles
  │                         │   })
  │ 200 { access_token }    │
  │ ←──────────────────────│
  │                         │
  │ GET /users              │
  │ Authorization: Bearer   │
  │ ──────────────────────→│ JwtAuthGuard → validate
  │                         │ TenantMiddleware:
  │                         │   ALS.run({ tenantId })
  │                         │   → TenantRlsSubscriber:
  │                         │     SET app.current_tenant_id
  │                         │   → TypeORM query (RLS filters)
  │ 200 [ users... ]        │
  │ ←──────────────────────│
```

### RLS Policy Pattern (applied to every tenant-scoped table)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## Entity Model

```
tenants (id PK, name, slug, settings JSONB, is_active, created_at, updated_at)
  ↑
users (id PK, tenant_id FK→tenants, email UNIQUE, password_hash, name, active,
       refresh_token_hash?, created_at, updated_at)
  ↑
user_roles (user_id FK→users, role_id FK→roles) ← roles (id PK, tenant_id FK→tenants,
  ↑                                                       name, description, created_at)
  └────────────── role_permissions (role_id FK→roles, permission_id FK→permissions)

permissions (id PK, resource, action, name — system-level, NO tenant_id, seeded)
```

Every row with `tenant_id` gets RLS enabled. `permissions` is global (seeded, not tenant-scoped).

## Module Boundaries

```
AuthModule       → depends on: UsersModule, JwtModule
UsersModule      → depends on: TypeORM (User entity)
RolesModule      → depends on: TypeORM (Role, Permission, pivots)
PermissionsModule → depends on: TypeORM (Permission entity)
TenantModule     → cross-cutting (middleware, ALS, RLS subscriber)
```

Modules do NOT query each other's tables directly. UsersModule reads `users` table only. RolesModule reads `roles`, `role_permissions`, `permissions` only. Cross-module data goes through service methods (e.g. AuthService calls UsersService to find user).

## File Changes (Key Files)

| File | Action | Description |
|------|--------|-------------|
| `package.json`, `nx.json`, `tsconfig.base.json` | Create | Nx workspace root config |
| `docker/Dockerfile`, `docker/docker-compose.yml` | Create | Multi-stage build + PG service |
| `apps/api/src/main.ts`, `app.module.ts` | Create | NestJS bootstrap + root module |
| `apps/api/src/config/` | Create | Env config (JWT_SECRET, DB_URL) |
| `apps/api/src/entities/*.entity.ts` | Create | 6 TypeORM entities (tenant, user, role, permission, pivots) |
| `apps/api/src/database/migrations/001-init.sql` | Create | Schema + RLS policies + indexes |
| `apps/api/src/database/seeds/001-roles-permissions.ts` | Create | 3 seed roles, ~20 permissions |
| `apps/api/src/common/tenants/` | Create | ALS context + middleware + TypeORM RLS subscriber |
| `apps/api/src/common/guards/` | Create | `JwtAuthGuard` + `PermissionsGuard` |
| `apps/api/src/common/decorators/` | Create | `@CurrentUser()`, `@RequirePermission()` |
| `apps/api/src/common/filters/` | Create | Global HTTP exception filter |
| `apps/api/src/modules/auth/` | Create | Controller, service, passport strategy, module |
| `apps/api/src/modules/users/` | Create | Controller, service, module |
| `apps/api/src/modules/roles/` | Create | Controller, service, module |
| `apps/api/src/modules/permissions/` | Create | Controller, service, module |
| `libs/shared/src/lib/` | Create | DTOs, JwtPayload interface, permission constants |
| `apps/web/` | Create | Angular 20 skeleton (no features) |

~45 files total.

## Interfaces / Contracts

```typescript
// libs/shared/src/lib/interfaces/jwt-payload.interface.ts
interface JwtPayload {
  sub: string;          // user UUID
  email: string;
  tenant_id: string;
  roles: string[];      // role names
}

// Decorator + guard pair
@RequirePermission('users.write')  // sets route metadata
PermissionsGuard                    // reads metadata, checks user roles → 403
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | AuthService (validate, JWT), UsersService (CRUD), PermissionsGuard (allow/deny) | Jest mocks for repositories + reflector |
| Integration | RLS isolation (tenant A/B), auth flow (login → protected route), duplicate email | `@nestjs/testing` TestModule + testcontainers or SQLite |
| E2E | Out of scope (Fase 1) | None |

## Migration / Rollout

Greenfield — no data migration needed. Apply `001-init.sql` via TypeORM CLI or raw SQL. RLS enabled before seeding. Seed runs after migration: creates `Admin`/`Vendedor`/`Stock` roles with permission sets. Default admin user created for initial login.

## Open Questions

- [ ] Permission resolution: DB lookup at guard time vs in-memory cache with TTL?
- [ ] Soft-delete for users: `active` boolean flag vs `deleted_at` timestamp?
- [ ] Should `GET /auth/me` return full user profile from DB or decode JWT only?
