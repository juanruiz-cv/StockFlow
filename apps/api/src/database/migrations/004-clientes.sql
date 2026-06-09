-- ================================================================
-- Migration 004: Clientes
-- ================================================================

-- ================================================================
-- TABLES
-- ================================================================

-- 1. clientes (tenant-scoped)
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) DEFAULT NULL,
  phone           VARCHAR(50) DEFAULT NULL,
  document_type   VARCHAR(20) DEFAULT NULL,
  document_number VARCHAR(20) DEFAULT NULL,
  address         TEXT DEFAULT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at      TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_active ON clientes(is_active) WHERE is_active = TRUE;

-- Unique email per tenant (only when email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_tenant_email ON clientes(tenant_id, email) WHERE email IS NOT NULL;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- clientes: RLS policy
DROP POLICY IF EXISTS clientes_tenant_isolation ON clientes;
CREATE POLICY clientes_tenant_isolation ON clientes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ================================================================
-- UPDATED_AT TRIGGER
-- ================================================================

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
