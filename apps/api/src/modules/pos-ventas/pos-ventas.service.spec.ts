import { Test, TestingModule } from '@nestjs/testing';
import { PosVentasService } from './pos-ventas.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment } from '../../entities/payment.entity';
import { Invoice } from '../../entities/invoice.entity';
import { TenantSequence } from '../../entities/tenant-sequence.entity';
import { ProductStock } from '../../entities/product-stock.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { Product } from '../../entities/product.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('PosVentasService', () => {
  let service: PosVentasService;
  let saleRepo: jest.Mocked<Pick<import('typeorm').Repository<Sale>, 'find' | 'findOne' | 'save'>>;
  let productRepo: jest.Mocked<Pick<import('typeorm').Repository<Product>, 'findOne'>>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let mockQueryRunner: any;
  let mockManager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    query: jest.Mock;
  };

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProduct: Partial<Product> = {
    id: 'prod-1',
    tenantId: mockTenantId,
    name: 'Test Product',
    sku: 'TEST-001',
    price: 100,
  } as Product;

  const mockProduct2: Partial<Product> = {
    id: 'prod-2',
    tenantId: mockTenantId,
    name: 'Test Product 2',
    sku: 'TEST-002',
    price: 50,
  } as Product;

  const mockStock: Partial<ProductStock> = {
    id: 'stock-1',
    tenantId: mockTenantId,
    productId: 'prod-1',
    quantity: 100,
  };

  const mockStock2: Partial<ProductStock> = {
    id: 'stock-2',
    tenantId: mockTenantId,
    productId: 'prod-2',
    quantity: 50,
  };

  const mockSale: Partial<Sale> = {
    id: 'sale-1',
    tenantId: mockTenantId,
    total: 250,
    voidedAt: null,
    notes: null,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockManager = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((_entity: any, data?: any) => data ? { ...data } : {}),
      save: jest.fn(),
      query: jest.fn(),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockManager,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosVentasService,
        {
          provide: getRepositoryToken(Sale),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SaleItem),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantSequence),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductStock),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
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
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<PosVentasService>(PosVentasService);
    saleRepo = module.get(getRepositoryToken(Sale)) as any;
    productRepo = module.get(getRepositoryToken(Product)) as any;
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  // ──────────────────────────────────────────────
  // createSale — Full flow
  // ──────────────────────────────────────────────
  describe('createSale', () => {
    const dto: CreateSaleDto = {
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
      payments: [
        { type: 'cash', amount: 200 },
        { type: 'card', amount: 50 },
      ],
    };

    it('should create a sale with full transaction flow', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      // Product lookups
      mockManager.findOne
        .mockResolvedValueOnce(mockProduct as Product)   // product 1
        .mockResolvedValueOnce(mockProduct2 as Product)   // product 2
        .mockResolvedValueOnce(mockStock as ProductStock) // stock 1 (FOR UPDATE)
        .mockResolvedValueOnce(mockStock2 as ProductStock); // stock 2 (FOR UPDATE)

      // Save stock updates
      mockManager.save
        .mockResolvedValueOnce({ ...mockStock, quantity: 98 })    // stock 1 saved
        .mockResolvedValueOnce({ ...mockStock2, quantity: 49 })   // stock 2 saved
        .mockResolvedValueOnce({ ...mockSale })                   // sale saved
        .mockResolvedValueOnce({})                                 // sale item 1
        .mockResolvedValueOnce({})                                 // sale item 2
        .mockResolvedValueOnce({})                                 // payment 1
        .mockResolvedValueOnce({})                                 // payment 2
        .mockResolvedValueOnce({})                                 // movement 1 ref update
        .mockResolvedValueOnce({})                                 // movement 2 ref update
        .mockResolvedValueOnce({ id: 'inv-1', invoiceNumber: 'INV-test-2025-00000001' }); // invoice

      // Invoice sequence
      mockManager.query.mockResolvedValue([{ next_val: 1 }]);

      // After commit, return the complete sale
      saleRepo.findOne.mockResolvedValue({
        ...mockSale,
        items: [],
        payments: [
          { id: 'p1', type: 'cash', amount: 200 },
          { id: 'p2', type: 'card', amount: 50 },
        ],
        invoice: { id: 'inv-1', invoiceNumber: 'INV-test-2025-00000001' },
      } as any);

      const result = await service.createSale(dto);

      // Verify transaction lifecycle
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();

      // Verify stock FOR UPDATE lock was used
      expect(mockManager.findOne).toHaveBeenCalledWith(
        ProductStock,
        expect.objectContaining({
          where: { productId: 'prod-1', tenantId: mockTenantId },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(mockManager.findOne).toHaveBeenCalledWith(
        ProductStock,
        expect.objectContaining({
          where: { productId: 'prod-2', tenantId: mockTenantId },
          lock: { mode: 'pessimistic_write' },
        }),
      );

      // Verify invoice sequence was called
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tenant_sequences'),
        [mockTenantId],
      );

      // Verify result
      expect(result).toBeDefined();
      expect(result.total).toBe(250); // 2*100 + 1*50
    });

    it('should use provided unitPrice instead of product price', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      const dtoWithPrice: CreateSaleDto = {
        items: [
          { productId: 'prod-1', quantity: 2, unitPrice: 90 },
        ],
        payments: [
          { type: 'cash', amount: 180 },
        ],
      };

      mockManager.findOne
        .mockResolvedValueOnce(mockProduct as Product)   // product
        .mockResolvedValueOnce(mockStock as ProductStock); // stock

      mockManager.save
        .mockResolvedValueOnce({ ...mockStock, quantity: 98 })
        .mockResolvedValueOnce({ ...mockSale, total: 180 })
        .mockResolvedValueOnce({})  // sale item
        .mockResolvedValueOnce({})  // payment
        .mockResolvedValueOnce({})  // movement ref update
        .mockResolvedValueOnce({ id: 'inv-1', invoiceNumber: 'INV-test-2025-00000001' });

      mockManager.query.mockResolvedValue([{ next_val: 2 }]);

      saleRepo.findOne.mockResolvedValue({
        ...mockSale,
        total: 180,
        items: [{ productId: 'prod-1', quantity: 2, unitPrice: 90, subtotal: 180 }],
        payments: [{ type: 'cash', amount: 180 }],
        invoice: { id: 'inv-1', invoiceNumber: 'INV-test-2025-00000002' },
      } as any);

      const result = await service.createSale(dtoWithPrice);

      expect(result.total).toBe(180);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      mockManager.findOne.mockResolvedValue(null); // product not found

      await expect(service.createSale(dto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      mockManager.findOne
        .mockResolvedValueOnce(mockProduct as Product)        // product 1 ok
        .mockResolvedValueOnce(mockProduct2 as Product)       // product 2 ok
        .mockResolvedValueOnce(mockStock as ProductStock)     // stock 1 (qty 100 >= 2) ok
        .mockResolvedValueOnce({ ...mockStock2, quantity: 0 } as ProductStock); // stock 2 insufficient

      await expect(service.createSale(dto)).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when payment mismatch', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      const dtoMismatch: CreateSaleDto = {
        items: [
          { productId: 'prod-1', quantity: 2 },
        ],
        payments: [
          { type: 'cash', amount: 10 }, // total should be 200, only 10 paid
        ],
      };

      mockManager.findOne
        .mockResolvedValueOnce(mockProduct as Product)   // product 1
        .mockResolvedValueOnce(mockStock as ProductStock); // stock 1 (FOR UPDATE)

      await expect(service.createSale(dtoMismatch)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback on database error', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      mockManager.findOne.mockRejectedValue(new Error('DB connection error'));

      await expect(service.createSale(dto)).rejects.toThrow('DB connection error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant context is missing', async () => {
      tenantContext.getTenantId.mockReturnValue(null);

      await expect(service.createSale(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getAllSales
  // ──────────────────────────────────────────────
  describe('getAllSales', () => {
    it('should return all sales for tenant', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);
      saleRepo.find.mockResolvedValue([mockSale as Sale]);

      const result = await service.getAllSales();

      expect(saleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
          order: { createdAt: 'DESC' },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────
  // getSaleById
  // ──────────────────────────────────────────────
  describe('getSaleById', () => {
    it('should return sale by id', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);
      saleRepo.findOne.mockResolvedValue(mockSale as Sale);

      const result = await service.getSaleById('sale-1');

      expect(saleRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sale-1', tenantId: mockTenantId },
        }),
      );
      expect(result).toEqual(mockSale);
    });

    it('should throw NotFoundException when sale not found', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);
      saleRepo.findOne.mockResolvedValue(null);

      await expect(service.getSaleById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // voidSale
  // ──────────────────────────────────────────────
  describe('voidSale', () => {
    it('should soft-void a sale (set voided_at)', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);
      saleRepo.findOne.mockResolvedValue(mockSale as Sale);
      saleRepo.save.mockResolvedValue({
        ...mockSale,
        voidedAt: new Date('2025-01-02T10:00:00Z'),
      } as Sale);

      const result = await service.voidSale('sale-1');

      expect(result.voidedAt).toBeDefined();
      expect(saleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ voidedAt: expect.any(Date) }),
      );
    });

    it('should throw BadRequestException when sale already voided', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);
      saleRepo.findOne.mockResolvedValue({
        ...mockSale,
        voidedAt: new Date('2025-01-01T12:00:00Z'),
      } as Sale);

      await expect(service.voidSale('sale-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when sale not found', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);
      saleRepo.findOne.mockResolvedValue(null);

      await expect(service.voidSale('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Invoice sequence generation
  // ──────────────────────────────────────────────
  describe('invoice sequence generation', () => {
    it('should generate invoice number with correct format', async () => {
      tenantContext.getTenantId.mockReturnValue(mockTenantId);

      mockManager.findOne
        .mockResolvedValueOnce(mockProduct as Product)
        .mockResolvedValueOnce(mockStock as ProductStock);

      mockManager.save
        .mockResolvedValueOnce({ ...mockStock, quantity: 98 })
        .mockResolvedValueOnce({ ...mockSale, total: 200 })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ id: 'inv-1', invoiceNumber: 'INV-11111111-2025-00000001' });

      // First call to sequence returns no rows → will insert new
      mockManager.query.mockResolvedValue([]);

      const dtoSimple: CreateSaleDto = {
        items: [{ productId: 'prod-1', quantity: 2 }],
        payments: [{ type: 'cash', amount: 200 }],
      };

      saleRepo.findOne.mockResolvedValue({
        ...mockSale,
        total: 200,
        items: [],
        payments: [],
        invoice: { id: 'inv-1', invoiceNumber: 'INV-11111111-2025-00000001' },
      } as any);

      const result = await service.createSale(dtoSimple);

      expect(result.invoice).toBeDefined();
      expect(result.invoice.invoiceNumber).toContain('INV-');
      expect(result.invoice.invoiceNumber).toContain('2025');
    });
  });

  // ──────────────────────────────────────────────
  // Tenant isolation
  // ──────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should use tenant context for queries', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-b');
      saleRepo.find.mockResolvedValue([]);

      await service.getAllSales();

      expect(saleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-b' }),
        }),
      );
    });
  });
});
