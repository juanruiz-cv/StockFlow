-- ================================================================
-- Migration 006: Caja (CashSessions, CashMovements)
-- ================================================================

-- ================================================================
-- TABLES
-- ================================================================

-- 1. cash_sessions (cash register sessions — one open per tenant)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ DEFAULT NULL,
  opening_balance   DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_balance   DECIMAL(12,2) DEFAULT NULL,
  expected_balance  DECIMAL(12,2) DEFAULT NULL,
  status            VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes             TEXT DEFAULT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. cash_movements (cash in/out transactions within a session)
CREATE TABLE IF NOT EXISTS cash_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
  amount          DECIMAL(12,2) NOT NULL,
  reason          VARCHAR(255) DEFAULT NULL,
  reference_type  VARCHAR(50) DEFAULT NULL,
  reference_id    UUID DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant_id ON cash_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_id ON cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON cash_sessions(opened_at DESC);

-- Partial unique index: only one open session per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_open_per_tenant
  ON cash_sessions(tenant_id)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_cash_movements_tenant_id ON cash_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session_id ON cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at DESC);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- cash_sessions: RLS policy
DROP POLICY IF EXISTS cash_sessions_tenant_isolation ON cash_sessions;
CREATE POLICY cash_sessions_tenant_isolation ON cash_sessions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- cash_movements: RLS policy
DROP POLICY IF EXISTS cash_movements_tenant_isolation ON cash_movements;
CREATE POLICY cash_movements_tenant_isolation ON cash_movements
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ================================================================
-- UPDATED_AT TRIGGERS
-- ================================================================

DROP TRIGGER IF EXISTS trg_cash_sessions_updated_at ON cash_sessions;
CREATE TRIGGER trg_cash_sessions_updated_at
  BEFORE UPDATE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
