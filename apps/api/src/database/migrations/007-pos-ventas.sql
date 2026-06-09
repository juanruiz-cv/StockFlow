-- ================================================================
-- Migration 007: POS / Ventas (Sales, Payments, Invoices, Sequences)
-- ================================================================

-- ================================================================
-- TABLES
-- ================================================================

-- 1. tenant_sequences (atomic auto-increment per tenant per sequence)
CREATE TABLE IF NOT EXISTS tenant_sequences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_name   VARCHAR(50) NOT NULL,
  next_val        BIGINT NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sequence_name)
);

-- 2. sales (transaction header)
CREATE TABLE IF NOT EXISTS sales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID DEFAULT NULL REFERENCES clientes(id) ON DELETE SET NULL,
  total       DECIMAL(12,2) NOT NULL,
  voided_at   TIMESTAMPTZ DEFAULT NULL,
  notes       TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. sale_items (line items per sale)
CREATE TABLE IF NOT EXISTS sale_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  quantity    DECIMAL(12,2) NOT NULL,
  unit_price  DECIMAL(12,2) NOT NULL,
  subtotal    DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. payments (payments applied to a sale)
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('cash', 'card', 'transfer')),
  amount      DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. invoices (one per sale — generated atomically)
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id         UUID NOT NULL UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  invoice_number  VARCHAR(50) NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

-- tenant_sequences
CREATE INDEX IF NOT EXISTS idx_tenant_sequences_tenant_id ON tenant_sequences(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_sequences_tenant_name
  ON tenant_sequences(tenant_id, sequence_name);

-- sales
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_voided_at ON sales(voided_at) WHERE voided_at IS NULL;

-- sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_id ON sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE tenant_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- tenant_sequences: RLS policy
DROP POLICY IF EXISTS tenant_sequences_tenant_isolation ON tenant_sequences;
CREATE POLICY tenant_sequences_tenant_isolation ON tenant_sequences
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- sales: RLS policy
DROP POLICY IF EXISTS sales_tenant_isolation ON sales;
CREATE POLICY sales_tenant_isolation ON sales
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- sale_items: RLS policy
DROP POLICY IF EXISTS sale_items_tenant_isolation ON sale_items;
CREATE POLICY sale_items_tenant_isolation ON sale_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- payments: RLS policy
DROP POLICY IF EXISTS payments_tenant_isolation ON payments;
CREATE POLICY payments_tenant_isolation ON payments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- invoices: RLS policy
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ================================================================
-- UPDATED_AT TRIGGERS
-- ================================================================

DROP TRIGGER IF EXISTS trg_tenant_sequences_updated_at ON tenant_sequences;
CREATE TRIGGER trg_tenant_sequences_updated_at
  BEFORE UPDATE ON tenant_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
