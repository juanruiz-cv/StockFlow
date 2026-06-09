import { DataSource } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { Supplier } from '../../entities/supplier.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Tenant } from '../../entities/tenant.entity';

/**
 * Seed script for demo transactional data (PR 1 scope).
 *
 * Products: categories, brands, suppliers, products
 * Customers: sample customers
 *
 * Idempotent: find-then-insert — safe to run multiple times.
 */
export async function seedTransaccional(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(Category);
  const brandRepo = dataSource.getRepository(Brand);
  const supplierRepo = dataSource.getRepository(Supplier);
  const productRepo = dataSource.getRepository(Product);
  const customerRepo = dataSource.getRepository(Customer);
  const tenantRepo = dataSource.getRepository(Tenant);

  // ──────────────────────────────────────────────
  // 1. Find default tenant
  // ──────────────────────────────────────────────

  const defaultTenant = await tenantRepo.findOne({
    where: { slug: 'default' },
  });

  if (!defaultTenant) {
    console.log('[Seed] No default tenant found — skipping transactional seed.');
    return;
  }

  const tenantId = defaultTenant.id;

  // ──────────────────────────────────────────────
  // 2. Seed Categories
  // ──────────────────────────────────────────────

  const categoryData = [
    { name: 'Bebidas', description: 'Gaseosas, aguas, jugos' },
    { name: 'Almacén', description: 'Alimentos no perecederos' },
    { name: 'Limpieza', description: 'Productos de limpieza' },
    { name: 'Lácteos', description: 'Leche, yogures, quesos' },
    { name: 'Snacks', description: 'Galletitas, chicles, snacks salados' },
  ];

  const savedCategories: Category[] = [];

  for (const cat of categoryData) {
    let existing = await categoryRepo.findOne({
      where: { name: cat.name, tenantId },
    });

    if (!existing) {
      existing = categoryRepo.create({ ...cat, tenantId });
      existing = await categoryRepo.save(existing);
    }

    savedCategories.push(existing);
  }

  // ──────────────────────────────────────────────
  // 3. Seed Brands
  // ──────────────────────────────────────────────

  const brandData = [
    { name: 'Coca Cola', description: 'Bebidas gaseosas' },
    { name: 'PepsiCo', description: 'Snacks y bebidas' },
    { name: 'La Serenísima', description: 'Productos lácteos' },
    { name: 'Molinos', description: 'Alimentos' },
    { name: 'Genérica', description: 'Productos genéricos' },
  ];

  const savedBrands: Brand[] = [];

  for (const br of brandData) {
    let existing = await brandRepo.findOne({
      where: { name: br.name, tenantId },
    });

    if (!existing) {
      existing = brandRepo.create({ ...br, tenantId });
      existing = await brandRepo.save(existing);
    }

    savedBrands.push(existing);
  }

  // ──────────────────────────────────────────────
  // 4. Seed Suppliers
  // ──────────────────────────────────────────────

  const supplierData = [
    { name: 'Distribuidora Sur SRL', contactName: 'Carlos López', email: 'carlos@distrisur.com', phone: '11-4567-8901' },
    { name: 'MaxiDistribución SA', contactName: 'María García', email: 'maria@maxidist.com', phone: '11-5678-9012' },
    { name: 'Proveedora del Centro', contactName: 'Juan Pérez', email: 'juan@provecentro.com', phone: '11-6789-0123' },
  ];

  const savedSuppliers: Supplier[] = [];

  for (const sup of supplierData) {
    let existing = await supplierRepo.findOne({
      where: { name: sup.name, tenantId },
    });

    if (!existing) {
      existing = supplierRepo.create({ ...sup, tenantId });
      existing = await supplierRepo.save(existing);
    }

    savedSuppliers.push(existing);
  }

  // ──────────────────────────────────────────────
  // 5. Seed Products
  // ──────────────────────────────────────────────

  const productData = [
    { name: 'Coca Cola 500ml', sku: 'COCA-500', price: 350.00, costPrice: 200.00, taxRate: 21.00, categoryIndex: 0, brandIndex: 0, supplierIndex: 0 },
    { name: 'Agua Mineral 1L', sku: 'AGUA-001', price: 250.00, costPrice: 140.00, taxRate: 21.00, categoryIndex: 0, brandIndex: 4, supplierIndex: 0 },
    { name: 'Leche Entera 1L', sku: 'LECHE-01', price: 380.00, costPrice: 250.00, taxRate: 10.50, categoryIndex: 3, brandIndex: 2, supplierIndex: 1 },
    { name: 'Galletitas Saladas', sku: 'GALL-001', price: 200.00, costPrice: 120.00, taxRate: 21.00, categoryIndex: 4, brandIndex: 1, supplierIndex: 2 },
    { name: 'Detergente 500ml', sku: 'DETER-01', price: 320.00, costPrice: 180.00, taxRate: 21.00, categoryIndex: 2, brandIndex: 4, supplierIndex: 1 },
  ];

  for (const pd of productData) {
    let existing = await productRepo.findOne({
      where: { sku: pd.sku, tenantId },
      withDeleted: true,
    });

    if (!existing) {
      const product = productRepo.create({
        name: pd.name,
        sku: pd.sku,
        price: pd.price,
        costPrice: pd.costPrice,
        taxRate: pd.taxRate,
        categoryId: savedCategories[pd.categoryIndex]?.id ?? null,
        brandId: savedBrands[pd.brandIndex]?.id ?? null,
        supplierId: savedSuppliers[pd.supplierIndex]?.id ?? null,
        tenantId,
      });
      await productRepo.save(product);
    }
  }

  // ──────────────────────────────────────────────
  // 6. Seed Customers
  // ──────────────────────────────────────────────

  const customerData = [
    { name: 'Juan Pérez', email: 'juan.perez@email.com', phone: '11-1111-1111', documentType: 'DNI', documentNumber: '12345678' },
    { name: 'María Rodríguez', email: 'maria.rodriguez@email.com', phone: '11-2222-2222', documentType: 'DNI', documentNumber: '23456789' },
    { name: 'Carlos Gómez', email: 'carlos.gomez@email.com', phone: '11-3333-3333', documentType: 'DNI', documentNumber: '34567890', address: 'Av. Siempre Viva 123' },
    { name: 'Ana Martínez', email: 'ana.martinez@email.com', phone: '11-4444-4444', documentType: 'DNI', documentNumber: '45678901' },
    { name: 'Cliente Final', email: null, phone: null, documentType: null, documentNumber: null, address: null },
  ];

  for (const cd of customerData) {
    const whereClause: any = { tenantId };
    if (cd.email) {
      whereClause.email = cd.email;
    } else {
      whereClause.name = cd.name;
    }

    let existing = await customerRepo.findOne({
      where: whereClause,
      withDeleted: true,
    });

    if (!existing) {
      const customer = customerRepo.create({ ...cd, tenantId });
      await customerRepo.save(customer);
    }
  }

  console.log('[Seed] Transactional data seeded successfully (PR 1).');
}
