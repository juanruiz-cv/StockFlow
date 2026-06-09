import { Test, TestingModule } from '@nestjs/testing';
import { ProductosService } from './productos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { Supplier } from '../../entities/supplier.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

describe('ProductosService', () => {
  let service: ProductosService;
  let productRepo: jest.Mocked<Pick<import('typeorm').Repository<Product>, 'find' | 'findOne' | 'create' | 'save' | 'delete'>>;
  let categoryRepo: jest.Mocked<Pick<import('typeorm').Repository<Category>, 'find' | 'findOne' | 'create' | 'save' | 'delete'>>;
  let brandRepo: jest.Mocked<Pick<import('typeorm').Repository<Brand>, 'find' | 'findOne' | 'create' | 'save' | 'delete'>>;
  let supplierRepo: jest.Mocked<Pick<import('typeorm').Repository<Supplier>, 'find' | 'findOne' | 'create' | 'save' | 'delete'>>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockProduct: Partial<Product> = {
    id: 'prod-1',
    tenantId: 'tenant-1',
    name: 'Test Product',
    sku: 'TEST-001',
    price: 100.00,
    taxRate: 21.00,
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Brand),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn(),
            getCurrentContext: jest.fn(),
            getUserId: jest.fn(),
            run: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductosService>(ProductosService);
    productRepo = module.get(getRepositoryToken(Product));
    categoryRepo = module.get(getRepositoryToken(Category));
    brandRepo = module.get(getRepositoryToken(Brand));
    supplierRepo = module.get(getRepositoryToken(Supplier));
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  // ──────────────────────────────────────────────
  // createProduct
  // ──────────────────────────────────────────────
  describe('createProduct', () => {
    const dto: CreateProductoDto = {
      name: 'New Product',
      sku: 'NEW-001',
      price: 150.00,
    };

    it('should create a product with tenantId', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(null); // no duplicate SKU
      productRepo.create.mockReturnValue(mockProduct as Product);
      productRepo.save.mockResolvedValue(mockProduct as Product);

      const result = await service.createProduct(dto);

      expect(tenantContext.getTenantId).toHaveBeenCalled();
      expect(productRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sku: dto.sku, tenantId: 'tenant-1' },
          withDeleted: true,
        }),
      );
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          tenantId: 'tenant-1',
        }),
      );
      expect(productRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException on duplicate SKU', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product); // duplicate

      await expect(service.createProduct(dto)).rejects.toThrow(ConflictException);
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant context is missing', async () => {
      tenantContext.getTenantId.mockReturnValue(null);

      await expect(service.createProduct(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // findAllProducts
  // ──────────────────────────────────────────────
  describe('findAllProducts', () => {
    it('should return only non-deleted products for tenant', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const products = [mockProduct as Product];
      productRepo.find.mockResolvedValue(products);

      const result = await service.findAllProducts();

      expect(productRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1', deletedAt: expect.any(Object) }),
        }),
      );
      expect(result).toEqual(products);
    });
  });

  // ──────────────────────────────────────────────
  // findProductById
  // ──────────────────────────────────────────────
  describe('findProductById', () => {
    it('should return product when found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      const result = await service.findProductById('prod-1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when not found', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findProductById('prod-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // updateProduct
  // ──────────────────────────────────────────────
  describe('updateProduct', () => {
    it('should update product name', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);
      productRepo.save.mockResolvedValue({ ...mockProduct, name: 'Updated' } as Product);

      const result = await service.updateProduct('prod-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw ConflictException when new SKU is taken', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const otherProduct = { ...mockProduct, id: 'prod-2', sku: 'TAKEN-001' } as Product;
      productRepo.findOne
        .mockResolvedValueOnce(mockProduct as Product) // findById
        .mockResolvedValueOnce(otherProduct); // duplicate SKU check

      await expect(
        service.updateProduct('prod-1', { sku: 'TAKEN-001' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // softDeleteProduct
  // ──────────────────────────────────────────────
  describe('softDeleteProduct', () => {
    it('should set deletedAt on product', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const product = { ...mockProduct, deletedAt: null } as Product;
      productRepo.findOne.mockResolvedValue(product);
      productRepo.save.mockImplementation(async (u: any) => ({ ...u, deletedAt: new Date() }));

      await service.softDeleteProduct('prod-1');

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // Tenant isolation test (integration-style)
  // ──────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should only query products for the current tenant', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      const tenantAProduct = { ...mockProduct, id: 'pa-1', tenantId: 'tenant-a' } as Product;
      const tenantBProduct = { ...mockProduct, id: 'pb-1', tenantId: 'tenant-b', sku: 'OTHER-001' } as Product;

      productRepo.find.mockImplementation((_opts?: any) => {
        const currentTenantId = tenantContext.getTenantId();
        return Promise.resolve(
          [tenantAProduct, tenantBProduct].filter(
            (p) => p.tenantId === currentTenantId && p.deletedAt === null,
          ),
        );
      });

      const result = await service.findAllProducts();

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-a');
    });
  });

  // ──────────────────────────────────────────────
  // Categories
  // ──────────────────────────────────────────────
  describe('Categories CRUD', () => {
    it('should create a category', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const cat = { id: 'cat-1', tenantId: 'tenant-1', name: 'Test Cat' } as Category;
      categoryRepo.create.mockReturnValue(cat);
      categoryRepo.save.mockResolvedValue(cat);

      const result = await service.createCategory({ name: 'Test Cat' });
      expect(result.name).toBe('Test Cat');
    });

    it('should list categories', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      categoryRepo.find.mockResolvedValue([{ id: 'cat-1', name: 'Cat A' } as Category]);

      const result = await service.findAllCategories();
      expect(result).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────
  // Brands
  // ──────────────────────────────────────────────
  describe('Brands CRUD', () => {
    it('should create a brand', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const br = { id: 'brand-1', tenantId: 'tenant-1', name: 'Test Brand' } as Brand;
      brandRepo.create.mockReturnValue(br);
      brandRepo.save.mockResolvedValue(br);

      const result = await service.createBrand({ name: 'Test Brand' });
      expect(result.name).toBe('Test Brand');
    });
  });

  // ──────────────────────────────────────────────
  // Suppliers
  // ──────────────────────────────────────────────
  describe('Suppliers CRUD', () => {
    it('should create a supplier', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const sup = { id: 'sup-1', tenantId: 'tenant-1', name: 'Test Supplier' } as Supplier;
      supplierRepo.create.mockReturnValue(sup);
      supplierRepo.save.mockResolvedValue(sup);

      const result = await service.createSupplier({ name: 'Test Supplier' });
      expect(result.name).toBe('Test Supplier');
    });
  });
});
