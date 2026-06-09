## Exploration: Core Infrastructure & Authentication (Fase 1)

### Current State

Proyecto GREENFIELD — completamente vacío. No hay `package.json`, ni configuración Nx, ni Docker, ni base de datos. Solo existe el scaffolding de openspec (`openspec/config.yaml`, directorios `changes/` y `specs/` vacíos).

---

### Affected Areas (archivos y directorios a crear)

```
app/
├── .nx/                          # Caché local de Nx
├── nx.json                       # Configuración global Nx
├── package.json                  # Root workspace (workspaces: apps/*, libs/*)
├── package-lock.json
├── tsconfig.base.json            # TS base config compartida
├── .eslintrc.json                # ESLint global
├── .prettierrc                   # Prettier
├── .gitignore
├── docker/
│   ├── Dockerfile                # Multi-stage build para NestJS
│   └── docker-compose.yml        # Postgres + Redis + App (dev)
│
├── apps/
│   ├── api/                      # NestJS backend (modular monolith)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── tenants/      # Tenant middleware + RLS context
│   │   │   │   │   ├── tenant.middleware.ts
│   │   │   │   │   ├── tenant.context.ts  # ALS holder
│   │   │   │   │   └── tenant.module.ts
│   │   │   │   ├── guards/       # JwtAuthGuard + PermissionsGuard
│   │   │   │   ├── decorators/   # @CurrentUser, @TenantId
│   │   │   │   ├── filters/      # Global exception filter
│   │   │   │   └── interceptors/ # Logging, transform
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # Login, JWT issuance
│   │   │   │   ├── users/        # CRUD usuarios
│   │   │   │   ├── roles/        # CRUD roles
│   │   │   │   └── permissions/  # CRUD permisos
│   │   │   ├── database/
│   │   │   │   ├── migrations/   # TypeORM/Knex migrations
│   │   │   │   └── seeds/
│   │   │   └── config/           # Env-based config
│   │   ├── test/
│   │   ├── project.json
│   │   └── tsconfig.json
│   │
│   └── web/                      # Angular frontend (Fase 2+)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layouts/
│       │   │   ├── pages/
│       │   │   ├── shared/
│       │   │   └── core/
│       │   ├── assets/
│       │   ├── main.ts
│       │   ├── index.html
│       │   └── styles.css
│       ├── project.json
│       └── tsconfig.json
│
└── libs/
    └── shared/                   # Nx library: DTOs, interfaces, types
        ├── src/
        │   ├── lib/
        │   │   ├── dto/
        │   │   ├── interfaces/
        │   │   └── types/
        ├── project.json
        └── tsconfig.json
```

---

### Approaches

#### 1. Nx Workspace: `--preset=apps` vs `--preset=nest` vs `--preset=angular`

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **`--preset=apps`** + add `@nx/nest` + `@nx/angular` | Arranca limpio, sin presets opinados. Control total sobre estructura. | Requiere instalar plugins manualmente. | Bajo |
| `--preset=nest` + add `@nx/angular` | Arranca con NestJS funcionando, solo agregás Angular. | Trae defaults de Nest que después hay que override. | Bajo |
| `--preset=angular` + add `@nx/nest` | Arranca con Angular funcionando. | Angular no es prioritario ahora; te hace configurar cosas que no vas a usar en Fase 1. | Bajo |

**Veredicto**: `--preset=apps`. Nx 21. Es el más limpio para un proyecto greenfield con ambas apps. No pagás overhead de un preset que después overrideás.

#### 2. Nx Plugin Strategy: `@nx/nest` vs manual

**Recomendación**: Usar `@nx/nest` y `@nx/angular`. Los plugins oficiales de Nx generan el scaffolding correcto, configuran los executors de build/test, y se mantienen al día con las versiones de los frameworks. No hay razón para hacerlo manual.

#### 3. NestJS: Modular Monolith con AsyncLocalStorage

**Recomendación**: NestJS 11.x. Usar `AsyncLocalStorage` nativo de Node.js (disponible desde Node 16+) para el tenant context. El patrón es:

```
Request → JwtAuthGuard (extrae tenant_id del JWT) → 
TenantMiddleware (ALS.run({tenantId, userId})) → 
DB Query (lee tenant_id de ALS y hace SET app.current_tenant_id)
```

La estrategia de ContextIdFactory solo si necesitás DI scoped por tenant (durable providers). Para Fase 1 no hace falta — ALS es suficiente y más simple.

#### 4. Angular: ¿Angular Material vs Tailwind?

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **Tailwind CSS** | UI completamente custom, ideal para keyboard-first. Sin peso muerto de Material. Bundle pequeño. | Más trabajo inicial de diseño system. No hay componentes pre-hechos. | Medio |
| Angular Material | Componentes listos (table, dialog, form). Sigue Material Design. | Opinado. Dificultad para customizar a keyboard-first. Bundle grande. Estética "google". | Bajo |
| Mixed (Material + Tailwind) | Lo mejor de ambos. | Inconsistencia visual si no se maneja bien. Dos sistemas de estilos. | Alto |

**Veredicto**: **Tailwind CSS puro**. La UX es keyboard-first (F1-F3, CTRL+P/V, ALT+C), y Angular Material está diseñado para mouse-first. Tailwind permite exactamente el control que necesitás. Además, Angular v20 ya tiene soporte nativo para Tailwind 4.

Para componentes complejos (datatables, selects, etc) podés construir con Tailwind + CDK de Angular (sin Material theme) si necesitás accesibilidad base.

#### 5. Angular: ¿Empezar UI en Fase 1 o solo API?

**Recomendación**: **Solo API en Fase 1**. Crear el proyecto Angular en el workspace con `@nx/angular:app` pero sin desarrollar features. La Fase 1 es pura infraestructura y backend. Angulaar arranca en Fase 2 cuando haya endpoints que consumir.

#### 6. Base de Datos: PostgreSQL + RLS Multi-tenant

**Estrategia**: Schema compartido (una sola base, todas las tablas tienen `tenant_id`).

```
-- En cada migración:
ALTER TABLE mi_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY mi_tabla_tenant ON mi_tabla
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**ORM**: TypeORM (integración nativa con `@nestjs/typeorm` y Nx) vs Knex (query builder, más control).

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **TypeORM** | Decoradores, integración NestJS nativa, migrations CLI. | Algo opinado en queries complejas. | Bajo |
| Knex + Objection | Más control sobre SQL, query builder puro. | Menos integración NestJS, más boilerplate. | Medio |
| Prisma | Schema-first, type-safe, migrations automáticas. | Capa pesada, no corre en edge, opinions fuertes. | Medio |

**Veredicto**: **TypeORM**. Es el estándar en el ecosistema NestJS, tiene soporte Nx vía `@nx/nest`, y para un modular monolith con queries simples en Fase 1 alcanza y sobra. Si más adelante necesitás raw SQL, TypeORM permite `getManager().query(...)`.

#### 7. Autenticación: JWT con tenant_id embebido

**Recomendación**: `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`.

El JWT payload incluye:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenant_id": "tenant-uuid",
  "roles": ["admin"],
  "permissions": ["users:write"]
}
```

**Refresh tokens**: Incluir desde Fase 1 aunque no se implemente el flujo completo hasta Fase 2. Dejá el campo `refresh_token` en la tabla `users` y la lógica de rotación para después.

#### 8. Redis: Cache vs Rate Limiting vs Sesiones

**Recomendación**: **Redis para caché + rate limiting**. NO para sesiones (usamos JWT stateless — no hay sesiones que guardar).

- `@nestjs/cache-manager` con `@keyv/redis` para caching general
- `@nestjs/throttler` configurado con Redis store para rate limiting distribuido
- Futuro: colas, pub/sub, websocket adapters

En Fase 1, Redis es nice-to-have. Si querés simplificar, podés skip Redis y usar caché en memoria hasta Fase 2.

#### 9. Docker / Coolify

**Recomendación**: Dockerfile multi-stage estándar:

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nx build api --prod

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/api ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

`docker-compose.yml` para dev con Postgres + Redis:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

volumes:
  pgdata:
```

Coolify deploy: usa este Dockerfile + variables de entorno. Nx build cachea en CI con Nx Cloud.

---

### Resumen de Recomendaciones

| Decisión | Opción Elegida | Versión |
|----------|---------------|---------|
| Nx Workspace | `--preset=apps` + `@nx/nest` + `@nx/angular` | Nx 21.x |
| Backend Framework | NestJS modular monolith | v11.x |
| Frontend Framework | Angular standalone + Signals (crear proyecto, no desarrollar) | v20.x |
| UI Library | Tailwind CSS v4 (para Fase 2+) | v4 |
| ORM | TypeORM con `@nestjs/typeorm` | latest |
| Auth | `@nestjs/jwt` + `passport-jwt` | latest |
| Tenant Context | AsyncLocalStorage nativo | Node.js built-in |
| DB RLS Strategy | `SET app.current_tenant_id` + policies | — |
| Redis | `@keyv/redis` para caché + rate limiting | latest |
| Docker | Multi-stage con `node:22-alpine` | — |

### Shared Libraries en Nx

Sí, conviene crear UNA library compartida: `libs/shared` con:
- DTOs y interfaces (reusables entre backend y frontend)
- Tipos de constantes (roles, permisos, enums)
- La validación de schemas (Zod o class-validator)

Ventaja: cuando en Fase 2 empiece Angular, ya tiene los tipos importados desde `@app/shared`.

---

### Fase 1: Scope Concreto

Lo que se construye en Fase 1:
1. ✅ Nx workspace con apps/api + apps/web (esqueleto) + libs/shared
2. ✅ Dockerfile + docker-compose.yml para dev
3. ✅ Base de datos: migración inicial con tabla `tenants` + RLS global
4. ✅ Middleware de tenants con AsyncLocalStorage
5. ✅ Módulo Auth: login, JWT con tenant_id, guard
6. ✅ Módulo Users: CRUD básico (scoped por tenant vía RLS)
7. ✅ Módulo Roles y Permisos: asignación a usuarios

Lo que NO se hace en Fase 1:
- ❌ UI de Angular (solo se crea el proyecto)
- ❌ Refresh token rotation (solo se deja el campo)
- ❌ Rate limiting con Redis (caché en memoria hasta Fase 2)
- ❌ Tests E2E (solo unit tests de servicios)

---

### Risks

1. **AsyncLocalStorage y CLS**: Si algún provider es singleton y guarda estado en constructor, puede leakear entre requests. SOLUCIÓN: siempre usar `@Injectable({ scope: Scope.REQUEST })` en servicios que usen ALS, o inyectar ALS solo en el método, no en constructor.

2. **TypeORM con RLS**: TypeORM hace cache de entidades. Si dos tenants distintos consultan la misma tabla con el mismo query, podría cachear datos incorrectos. SOLUCIÓN: deshabilitar query cache en tablas multi-tenant, o usar UUIDs de tenant en el cache key.

3. **JWT sin refresh tokens en Fase 1**: Si el token expira, el usuario queda afuera hasta reloguear. SOLUCIÓN: aceptable para Fase 1 interna. Para alpha, implementar refresh tokens en Fase 2.

4. **Nx 21 + Angular 20 compatibility**: Verificar la matrix de compatibilidad Nx/Angular antes de crear el workspace. Si la matrix no está actualizada, puede haber issues.

5. **Postgres 17 vs 16**: Verificar que Coolify soporte Postgres 17 antes de decidir la imagen.

---

### Ready for Proposal

**Yes**. La exploración es completa. Hay suficiente información para que el orchestrator prepare el proposal. Las decisiones están tomadas con alternativas documentadas donde había tradeoffs reales.

El orchestrator puede proceder con:
- **sdd-propose**: Formalizar intent, scope y approach
- **sdd-spec**: Escribir los delta specs con Given/When/Then
- **sdd-design**: Diagramas de secuencia para el flujo de autenticación y RLS
