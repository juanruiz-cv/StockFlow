import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductStock } from '../../entities/product-stock.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { Product } from '../../entities/product.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { MovementInDto } from './dto/movement-in.dto';
import { MovementOutDto } from './dto/movement-out.dto';
import { AdjustDto } from './dto/adjust.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(ProductStock)
    private readonly stockRepository: Repository<ProductStock>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly tenantContext: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  private getTenantId(): string {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new NotFoundException('Tenant context not available');
    }
    return tenantId;
  }

  /**
   * Get current stock for a product within the tenant.
   */
  async getStock(productId: string): Promise<ProductStock | null> {
    const tenantId = this.getTenantId();
    return this.stockRepository.findOne({
      where: { productId, tenantId },
      relations: { product: true },
    });
  }

  /**
   * Get all stock records for the current tenant.
   */
  async getAllStock(): Promise<ProductStock[]> {
    const tenantId = this.getTenantId();
    return this.stockRepository.find({
      where: { tenantId },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get movement history for a product within the tenant.
   */
  async getMovements(productId: string): Promise<StockMovement[]> {
    const tenantId = this.getTenantId();
    return this.movementRepository.find({
      where: { productId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add stock (inbound) — creates or updates stock record,
   * records IN movement. Uses QueryRunner for consistency.
   */
  async inbound(dto: MovementInDto): Promise<{ stock: ProductStock; movement: StockMovement }> {
    const tenantId = this.getTenantId();

    // Verify product exists and belongs to tenant
    await this.ensureProductExists(dto.productId, tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the stock row for this product
      let stock = await queryRunner.manager.findOne(ProductStock, {
        where: { productId: dto.productId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        stock = queryRunner.manager.create(ProductStock, {
          productId: dto.productId,
          tenantId,
          quantity: 0,
        });
      }

      const previousQty = Number(stock.quantity);
      stock.quantity = previousQty + Number(dto.quantity);
      stock = await queryRunner.manager.save(stock);

      // Record movement
      const movement = queryRunner.manager.create(StockMovement, {
        tenantId,
        productId: dto.productId,
        type: 'IN',
        quantity: dto.quantity,
        unitPrice: dto.unitPrice ?? null,
        reason: dto.reason ?? null,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
      });
      const savedMovement = await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      return { stock, movement: savedMovement };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Remove stock (outbound) — validates sufficient quantity,
   * deducts and records OUT movement. Uses QueryRunner + FOR UPDATE.
   */
  async outbound(dto: MovementOutDto): Promise<{ stock: ProductStock; movement: StockMovement }> {
    const tenantId = this.getTenantId();

    await this.ensureProductExists(dto.productId, tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock and fetch stock
      const stock = await queryRunner.manager.findOne(ProductStock, {
        where: { productId: dto.productId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        throw new NotFoundException('No stock record found for this product');
      }

      const currentQty = Number(stock.quantity);
      const deductQty = Number(dto.quantity);

      if (currentQty < deductQty) {
        throw new BadRequestException(
          `Insufficient stock: available ${currentQty}, requested ${deductQty}`,
        );
      }

      stock.quantity = currentQty - deductQty;
      const savedStock = await queryRunner.manager.save(stock);

      const movement = queryRunner.manager.create(StockMovement, {
        tenantId,
        productId: dto.productId,
        type: 'OUT',
        quantity: dto.quantity,
        reason: dto.reason ?? null,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
      });
      const savedMovement = await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      return { stock: savedStock, movement: savedMovement };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Adjust stock to an exact quantity — creates or updates stock record,
   * records ADJUST movement. Uses QueryRunner + FOR UPDATE.
   */
  async adjust(dto: AdjustDto): Promise<{ stock: ProductStock; movement: StockMovement }> {
    const tenantId = this.getTenantId();

    await this.ensureProductExists(dto.productId, tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let stock = await queryRunner.manager.findOne(ProductStock, {
        where: { productId: dto.productId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      const previousQty = stock ? Number(stock.quantity) : 0;
      const newQty = Number(dto.newQuantity);

      if (!stock) {
        stock = queryRunner.manager.create(ProductStock, {
          productId: dto.productId,
          tenantId,
          quantity: newQty,
        });
      } else {
        stock.quantity = newQty;
      }

      stock = await queryRunner.manager.save(stock);

      // Record the adjustment movement
      const movement = queryRunner.manager.create(StockMovement, {
        tenantId,
        productId: dto.productId,
        type: 'ADJUST',
        quantity: newQty - previousQty,
        reason: dto.reason ?? `Adjusted from ${previousQty} to ${newQty}`,
      });
      const savedMovement = await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();

      return { stock, movement: savedMovement };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verify product exists and belongs to tenant.
   */
  private async ensureProductExists(productId: string, tenantId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }
}
