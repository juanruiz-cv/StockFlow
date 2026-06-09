-- ================================================================
-- Migration 001: Initial Schema + RLS Policies + Indexes
-- ================================================================

-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLES
-- ================================================================

-- 1. tenants (no RLS — parent table, not tenant-scoped)
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  settings    JSONB DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. users (tenant-scoped)
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at     TIMESTAMPTZ DEFAULT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. roles (tenant-scoped)
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. permissions (system-level, NO tenant_id — globally seeded)
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource    VARCHAR(100) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. user_roles (pivot, tenant-scoped via chain)
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

-- 6. role_permissions (pivot, scoped via chain)
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, permission_id)
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- permissions is system-level (global, no tenant_id) — NO RLS
-- tenants is parent table — NO RLS

-- Users: RLS policy
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Roles: RLS policy
DROP POLICY IF EXISTS roles_tenant_isolation ON roles;
CREATE POLICY roles_tenant_isolation ON roles
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- user_roles: RLS via subquery to users table
DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
CREATE POLICY user_roles_tenant_isolation ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_roles.user_id
        AND users.tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );

-- role_permissions: RLS via subquery to roles table
DROP POLICY IF EXISTS role_permissions_tenant_isolation ON role_permissions;
CREATE POLICY role_permissions_tenant_isolation ON role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.id = role_permissions.role_id
        AND roles.tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );

-- ================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
