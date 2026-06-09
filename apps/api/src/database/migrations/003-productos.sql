-- ================================================================
-- Migration 003: Productos (Categories, Brands, Suppliers, Products)
-- ================================================================

-- ================================================================
-- TABLES
-- ================================================================

-- 1. categorias (tenant-scoped)
CREATE TABLE IF NOT EXISTS categorias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. marcas (tenant-scoped)
CREATE TABLE IF NOT EXISTS marcas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. proveedores (tenant-scoped)
CREATE TABLE IF NOT EXISTS proveedores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255) DEFAULT NULL,
  email         VARCHAR(255) DEFAULT NULL,
  phone         VARCHAR(50) DEFAULT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. productos (tenant-scoped)
CREATE TABLE IF NOT EXISTS productos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID DEFAULT NULL REFERENCES categorias(id) ON DELETE SET NULL,
  brand_id    UUID DEFAULT NULL REFERENCES marcas(id) ON DELETE SET NULL,
  supplier_id UUID DEFAULT NULL REFERENCES proveedores(id) ON DELETE SET NULL,
  name        VARCHAR(255) NOT NULL,
  sku         VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  price       DECIMAL(12,2) NOT NULL,
  cost_price  DECIMAL(12,2) DEFAULT NULL,
  tax_rate    DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_categorias_tenant_id ON categorias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marcas_tenant_id ON marcas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_tenant_id ON proveedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_tenant_id ON productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_category_id ON productos(category_id);
CREATE INDEX IF NOT EXISTS idx_productos_brand_id ON productos(brand_id);
CREATE INDEX IF NOT EXISTS idx_productos_supplier_id ON productos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_productos_active ON productos(is_active) WHERE is_active = TRUE;

-- Unique SKU per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_tenant_sku ON productos(tenant_id, sku);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- categorias: RLS policy
DROP POLICY IF EXISTS categorias_tenant_isolation ON categorias;
CREATE POLICY categorias_tenant_isolation ON categorias
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- marcas: RLS policy
DROP POLICY IF EXISTS marcas_tenant_isolation ON marcas;
CREATE POLICY marcas_tenant_isolation ON marcas
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- proveedores: RLS policy
DROP POLICY IF EXISTS proveedores_tenant_isolation ON proveedores;
CREATE POLICY proveedores_tenant_isolation ON proveedores
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- productos: RLS policy
DROP POLICY IF EXISTS productos_tenant_isolation ON productos;
CREATE POLICY productos_tenant_isolation ON productos
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ================================================================
-- UPDATED_AT TRIGGERS
-- ================================================================

DROP TRIGGER IF EXISTS trg_categorias_updated_at ON categorias;
CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_marcas_updated_at ON marcas;
CREATE TRIGGER trg_marcas_updated_at
  BEFORE UPDATE ON marcas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON proveedores;
CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
