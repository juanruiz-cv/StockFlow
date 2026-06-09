# Proposal: Core Infrastructure & Authentication (Fase 1)

## Intent

Greenfield multi-tenant SaaS backend for computer store POS. Nx monorepo + NestJS modular monolith with JWT auth, tenant isolation via PostgreSQL RLS, and user/role/permission management. No UI in this phase.

## Scope

### In Scope
- Nx workspace: `apps/api` (NestJS), `apps/web` (Angular skeleton), `libs/shared`
- Docker multi-stage build + docker-compose (PostgreSQL)
- DB migration: `tenants` table + global RLS
- Tenant middleware (ALS → `SET app.current_tenant_id`)
- Auth module: login, JWT with tenant_id, guard
- Users module: CRUD scoped by tenant via RLS
- Roles & Permissions: CRUD + user assignment

### Out of Scope
- Angular UI (scaffolded only)
- Refresh token rotation (column reserved, logic deferred)
- Redis cache (in-memory until Fase 2)
- E2E tests (unit tests only)
- Product/Stock/Caja/POS (Fase 2)

## Capabilities

### New Capabilities
- **tenant-isolation**: ALS tenant context, RLS policies, middleware extracting tenant_id from JWT
- **auth-jwt**: Login, JWT issuance/validation (`@nestjs/jwt` + `passport-jwt`), `JwtAuthGuard`
- **user-management**: CRUD users scoped by tenant, password hashing, RLS isolation
- **role-permission**: Role/permission CRUD, user-role assignment, `PermissionsGuard`

### Modified Capabilities
None — greenfield project.

## Approach

Nx 21 `--preset=apps` + `@nx/nest` + `@nx/angular`. NestJS 11 modular monolith. TypeORM. JWT via `@nestjs/jwt`. ALS middleware sets `app.current_tenant_id` pre-query. Each module: controller, service, entity, module file.

## Affected Areas

| Area | Impact | Changes |
|------|--------|---------|
| `apps/api/src/` | New | Auth, users, roles, permissions modules |
| `apps/web/` | New | Angular skeleton |
| `libs/shared/src/lib/` | New | DTOs, interfaces, enums |
| `docker/` | New | Dockerfile + docker-compose.yml |
| `apps/api/src/common/` | New | Guards, decorators, filters, tenant middleware |
| Root config files | New | `nx.json`, `package.json`, `tsconfig.base.json` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ALS state leak in singleton providers | Low | Scope.REQUEST or inject ALS at method level |
| TypeORM cache stale cross-tenant data | Med | Disable query cache on multi-tenant tables |
| JWT expiry (no refresh in Fase 1) | Low | Acceptable; implement pre-alpha in Fase 2 |

## Rollback Plan

Pre-migration: `git clean -fd` + `git checkout main`. Post-migration: down-migration, drop tables, disable RLS. Post-seed: truncate `users`, `roles`, `permissions` before schema rollback.

## Dependencies

Node.js 22+, Docker Desktop, Nx CLI

## Success Criteria

- [ ] `npx nx run-many -t build` passes for `api` and `web`
- [ ] `POST /auth/login` returns JWT with `sub`, `tenant_id`, `roles`
- [ ] Tenant middleware sets `app.current_tenant_id` on every request
- [ ] Tenant A users invisible to Tenant B (DB query)
- [ ] `PermissionsGuard` rejects unauthorized access
- [ ] `docker compose up` starts Postgres + app, healthcheck passes
