-- ================================================================
-- Migration 002: Fix RLS for login flow + per-tenant email uniqueness
-- ================================================================
--
-- Problems fixed:
--   1. RLS policies used current_setting() without missing_ok=true,
--      causing errors on unauthenticated routes (login).
--   2. Email was globally unique, preventing the same email from
--      being used across different tenants.
--   3. No login-specific RLS policy existed for user table SELECT.
--
-- ================================================================
-- FIX RLS POLICIES
-- ================================================================

-- 1. Users: use missing_ok=true so login queries don't crash
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Allow unauthenticated SELECT on users for login flow
DROP POLICY IF EXISTS users_login_select ON users;
CREATE POLICY users_login_select ON users
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) IS NULL);

-- 2. Roles: use missing_ok=true
DROP POLICY IF EXISTS roles_tenant_isolation ON roles;
CREATE POLICY roles_tenant_isolation ON roles
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 3. user_roles: use missing_ok=true in subquery
DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles;
CREATE POLICY user_roles_tenant_isolation ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_roles.user_id
        AND users.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- 4. role_permissions: use missing_ok=true in subquery
DROP POLICY IF EXISTS role_permissions_tenant_isolation ON role_permissions;
CREATE POLICY role_permissions_tenant_isolation ON role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.id = role_permissions.role_id
        AND roles.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ================================================================
-- FIX EMAIL CONSTRAINT (global → per-tenant composite)
-- ================================================================

-- Drop the global unique index on email
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS uq_users_email;

-- Create a composite unique index on (tenant_id, email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
