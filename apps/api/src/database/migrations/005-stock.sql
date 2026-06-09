-- ================================================================
-- Migration 005: Stock (ProductStock, StockMovements)
-- ================================================================

-- ================================================================
-- TABLES
-- ================================================================

-- 1. product_stock (current stock per product per tenant)
CREATE TABLE IF NOT EXISTS product_stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  quantity    DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, product_id)
);

-- 2. stock_movements (audit ledger — every in/out/adjust creates a row)
CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUST')),
  quantity        DECIMAL(12,2) NOT NULL,
  unit_price      DECIMAL(12,2) DEFAULT NULL,
  reason          TEXT DEFAULT NULL,
  reference_type  VARCHAR(50) DEFAULT NULL,
  reference_id    UUID DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_product_stock_tenant_id ON product_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_product_id ON product_stock(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- product_stock: RLS policy
DROP POLICY IF EXISTS product_stock_tenant_isolation ON product_stock;
CREATE POLICY product_stock_tenant_isolation ON product_stock
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- stock_movements: RLS policy
DROP POLICY IF EXISTS stock_movements_tenant_isolation ON stock_movements;
CREATE POLICY stock_movements_tenant_isolation ON stock_movements
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ================================================================
-- UPDATED_AT TRIGGERS (not needed — product_stock is append-heavy,
-- stock_movements is append-only audit trail)
-- ================================================================
