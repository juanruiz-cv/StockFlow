import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductStock } from '../../entities/product-stock.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { Product } from '../../entities/product.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MovementInDto } from './dto/movement-in.dto';
import { MovementOutDto } from './dto/movement-out.dto';
import { AdjustDto } from './dto/adjust.dto';

describe('StockService', () => {
  let service: StockService;
  let stockRepo: jest.Mocked<Pick<import('typeorm').Repository<ProductStock>, 'find' | 'findOne' | 'create' | 'save'>>;
  let movementRepo: jest.Mocked<Pick<import('typeorm').Repository<StockMovement>, 'find' | 'create' | 'save'>>;
  let productRepo: jest.Mocked<Pick<import('typeorm').Repository<Product>, 'findOne'>>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let mockQueryRunner: any;
  let mockManager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const mockStock: Partial<ProductStock> = {
    id: 'stock-1',
    tenantId: 'tenant-1',
    productId: 'prod-1',
    quantity: 100,
    createdAt: new Date('2025-01-01'),
  };

  const mockProduct: Partial<Product> = {
    id: 'prod-1',
    tenantId: 'tenant-1',
    name: 'Test Product',
    sku: 'TEST-001',
  } as Product;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // Mock QueryRunner
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
        StockService,
        {
          provide: getRepositoryToken(ProductStock),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            find: jest.fn(),
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

    service = module.get<StockService>(StockService);
    stockRepo = module.get(getRepositoryToken(ProductStock));
    movementRepo = module.get(getRepositoryToken(StockMovement));
    productRepo = module.get(getRepositoryToken(Product));
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  // ──────────────────────────────────────────────
  // getStock
  // ──────────────────────────────────────────────
  describe('getStock', () => {
    it('should return stock for a product', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      stockRepo.findOne.mockResolvedValue(mockStock as ProductStock);

      const result = await service.getStock('prod-1');

      expect(stockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1', tenantId: 'tenant-1' },
        }),
      );
      expect(result).toEqual(mockStock);
    });

    it('should return null when no stock record exists', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      stockRepo.findOne.mockResolvedValue(null);

      const result = await service.getStock('prod-1');
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // getAllStock
  // ──────────────────────────────────────────────
  describe('getAllStock', () => {
    it('should return all stock records for tenant', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      stockRepo.find.mockResolvedValue([mockStock as ProductStock]);

      const result = await service.getAllStock();

      expect(stockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────
  // getMovements
  // ──────────────────────────────────────────────
  describe('getMovements', () => {
    it('should return movement history for a product', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      const movements = [{ id: 'mov-1', productId: 'prod-1', type: 'IN' } as StockMovement];
      movementRepo.find.mockResolvedValue(movements);

      const result = await service.getMovements('prod-1');

      expect(movementRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1', tenantId: 'tenant-1' },
        }),
      );
      expect(result).toEqual(movements);
    });
  });

  // ──────────────────────────────────────────────
  // inbound
  // ──────────────────────────────────────────────
  describe('inbound', () => {
    const dto: MovementInDto = {
      productId: 'prod-1',
      quantity: 50,
      reason: 'Supplier restock',
    };

    it('should add stock and record IN movement', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      // Existing stock
      mockManager.findOne.mockResolvedValue(mockStock as ProductStock);
      mockManager.create.mockReturnValue({} as any);
      mockManager.save
        .mockResolvedValueOnce({ ...mockStock, quantity: 150 }) // saved stock
        .mockResolvedValueOnce({ id: 'mov-1', productId: 'prod-1', type: 'IN', quantity: 50 }); // saved movement

      const result = await service.inbound(dto);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockManager.findOne).toHaveBeenCalledWith(
        ProductStock,
        expect.objectContaining({
          where: { productId: 'prod-1', tenantId: 'tenant-1' },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(result.stock.quantity).toBe(150);
      expect(result.movement.type).toBe('IN');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create stock record if none exists', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      mockManager.findOne.mockResolvedValue(null); // no existing stock
      mockManager.create.mockReturnValue({} as any);
      mockManager.save
        .mockResolvedValueOnce({ id: 'stock-new', productId: 'prod-1', tenantId: 'tenant-1', quantity: 50 })
        .mockResolvedValueOnce({ id: 'mov-1', type: 'IN', quantity: 50 });

      const result = await service.inbound(dto);

      expect(result.stock.quantity).toBe(50);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);
      mockManager.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.inbound(dto)).rejects.toThrow('DB error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.inbound(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // outbound
  // ──────────────────────────────────────────────
  describe('outbound', () => {
    const dto: MovementOutDto = {
      productId: 'prod-1',
      quantity: 30,
      reason: 'Sale',
    };

    it('should deduct stock and record OUT movement', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      mockManager.findOne.mockResolvedValue(mockStock as ProductStock); // qty=100
      mockManager.save
        .mockResolvedValueOnce({ ...mockStock, quantity: 70 })
        .mockResolvedValueOnce({ id: 'mov-1', type: 'OUT', quantity: 30 });

      const result = await service.outbound(dto);

      expect(result.stock.quantity).toBe(70);
      expect(result.movement.type).toBe('OUT');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      const lowStock = { ...mockStock, quantity: 10 };
      mockManager.findOne.mockResolvedValue(lowStock as ProductStock);

      await expect(service.outbound({ ...dto, quantity: 30 })).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when no stock record', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);
      mockManager.findOne.mockResolvedValue(null);

      await expect(service.outbound(dto)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // adjust
  // ──────────────────────────────────────────────
  describe('adjust', () => {
    const dto: AdjustDto = {
      productId: 'prod-1',
      newQuantity: 200,
      reason: 'Inventory correction',
    };

    it('should adjust stock to exact quantity', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      mockManager.findOne.mockResolvedValue(mockStock as ProductStock); // qty=100
      mockManager.save
        .mockResolvedValueOnce({ ...mockStock, quantity: 200 })
        .mockResolvedValueOnce({ id: 'mov-1', type: 'ADJUST', quantity: 100 });

      const result = await service.adjust(dto);

      expect(result.stock.quantity).toBe(200);
      expect(result.movement.type).toBe('ADJUST');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create stock record if none exists', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      mockManager.findOne.mockResolvedValue(null); // no stock
      mockManager.create.mockReturnValue({} as any);
      mockManager.save
        .mockResolvedValueOnce({ id: 'stock-new', productId: 'prod-1', tenantId: 'tenant-1', quantity: 200 })
        .mockResolvedValueOnce({ id: 'mov-1', type: 'ADJUST', quantity: 200 });

      const result = await service.adjust({ ...dto, newQuantity: 200 });

      expect(result.stock.quantity).toBe(200);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // FOR UPDATE lock verification
  // ──────────────────────────────────────────────
  describe('FOR UPDATE lock', () => {
    it('should request pessimistic_write lock on stock queries', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-1');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);

      mockManager.findOne.mockResolvedValue(mockStock as ProductStock);
      mockManager.save.mockResolvedValue({} as any);

      await service.outbound({ productId: 'prod-1', quantity: 10 });

      expect(mockManager.findOne).toHaveBeenCalledWith(
        ProductStock,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // Tenant isolation
  // ──────────────────────────────────────────────
  describe('tenant isolation', () => {
    it('should use tenant context for queries', async () => {
      tenantContext.getTenantId.mockReturnValue('tenant-a');
      productRepo.findOne.mockResolvedValue(mockProduct as Product);
      mockManager.findOne.mockResolvedValue(mockStock as ProductStock);
      mockManager.save.mockResolvedValue({} as any);

      await service.outbound({ productId: 'prod-1', quantity: 10 });

      expect(mockManager.findOne).toHaveBeenCalledWith(
        ProductStock,
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-a' }),
        }),
      );
    });
  });
});
