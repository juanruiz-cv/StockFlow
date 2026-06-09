# Tasks: Core Infrastructure & Authentication

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Workspace + DB + Tenant infra | PR 1 | Build passes, migration runs, tenant context works |
| 2 | Auth + Users modules | PR 2 | Login/me working, user CRUD tenant-scoped |
| 3 | Roles + Permissions + Guards | PR 3 | RBAC enforced, seeds loaded |
| 4 | Tests | PR 4 | Unit + integration coverage |

## Phase 1: Workspace & Tooling

- [x] 1.1 Create Nx workspace `--preset=apps`, install `@nx/nest`, `@nx/angular`
- [x] 1.2 Create `docker/Dockerfile` multi-stage (node:22-alpine) + `docker/docker-compose.yml` (PostgreSQL 17)
- [x] 1.3 Create `.env`, env validation with `@nestjs/config` + Joi
- [x] 1.4 Create `apps/api/src/main.ts`, `app.module.ts` — NestJS bootstrap

## Phase 2: Database & Tenant Isolation

- [x] 2.1 Create 6 TypeORM entities: Tenant, User, Role, Permission, UserRole, RolePermission
- [x] 2.2 Create migration `001-init.sql` — schema + RLS policies + indexes
- [x] 2.3 Create ALS tenant context + middleware extracting tenant_id from JWT
- [x] 2.4 Create TypeORM RLS subscriber — `SET app.current_tenant_id` pre-query

## Phase 3: Auth Module

- [ ] 3.1 Create `AuthModule` with `@nestjs/jwt` + `passport-jwt`
- [ ] 3.2 Create `JwtStrategy` — validate token, extract sub/email/tenant_id/roles
- [ ] 3.3 Create `JwtAuthGuard` — Bearer validation, configurable global/route
- [ ] 3.4 Create `POST /auth/login` — find user, bcrypt verify, sign JWT with tenant_id
- [ ] 3.5 Create `GET /auth/me` — DB lookup returning current user profile

## Phase 4: Users Module

- [ ] 4.1 Create `UsersModule` — controller + service, CRUD scoped by tenant via RLS
- [ ] 4.2 Implement soft-delete via `deleted_at` timestamp
- [ ] 4.3 Add email-unique-per-tenant constraint + bcrypt hash on user creation

## Phase 5: Roles & Permissions

- [ ] 5.1 Create `RolesModule` CRUD — scoped by tenant, block delete if assignments exist
- [ ] 5.2 Create `PermissionsModule` — list seeded system permissions (global)
- [ ] 5.3 Create `UserRole` assignment — assign/remove roles per user
- [ ] 5.4 Create `@RequirePermission()` decorator + `PermissionsGuard` with memory cache (TTL 30s)
- [ ] 5.5 Create seed script: Admin/Vendedor/Stock roles, ~20 permissions, default admin user

## Phase 6: Testing

- [ ] 6.1 Unit test AuthService — validate credentials, JWT sign/verify
- [ ] 6.2 Unit test UsersService — CRUD, duplicate email, soft-delete
- [ ] 6.3 Unit test PermissionsGuard — allow/deny by permission
- [ ] 6.4 Unit test JwtAuthGuard — reject missing/expired token
- [ ] 6.5 Integration test login flow — POST /auth/login returns 200/401
- [ ] 6.6 Integration test RLS isolation — tenant A/B cross-tenant invisibility
- [ ] 6.7 Integration test permissions guard — 403 on missing `@RequirePermission`
