import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Payment } from '../../entities/payment.entity';
import { Invoice } from '../../entities/invoice.entity';
import { TenantSequence } from '../../entities/tenant-sequence.entity';
import { ProductStock } from '../../entities/product-stock.entity';
import { StockMovement } from '../../entities/stock-movement.entity';
import { Product } from '../../entities/product.entity';
import { TenantContextService } from '../../common/tenants/tenant-context.service';
import { CreateSaleDto, SaleItemDto, PaymentDto } from './dto/create-sale.dto';

@Injectable()
export class PosVentasService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemRepository: Repository<SaleItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(TenantSequence)
    private readonly sequenceRepository: Repository<TenantSequence>,
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
   * Create a sale atomically:
   * 1. Validate all products exist
   * 2. Lock and validate stock for all items
   * 3. Deduct stock quantities
   * 4. Record stock movements (OUT, reference=sale_id)
   * 5. Validate sum(payments) = total
   * 6. Create Sale + SaleItems + Payments
   * 7. Atomic invoice number generation
   * 8. Create Invoice
   * 9. Commit — or rollback on ANY error
   */
  async createSale(dto: CreateSaleDto): Promise<Sale> {
    const tenantId = this.getTenantId();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate all products exist and get their prices
      const productMap = new Map<string, Product>();
      for (const item of dto.items) {
        if (!productMap.has(item.productId)) {
          const product = await queryRunner.manager.findOne(Product, {
            where: { id: item.productId, tenantId },
          });
          if (!product) {
            throw new NotFoundException(`Product not found: ${item.productId}`);
          }
          productMap.set(item.productId, product);
        }
      }

      // 2. Lock stock rows (FOR UPDATE) and validate sufficient stock
      type StockEntry = { stock: ProductStock; item: SaleItemDto; product: Product };
      const stockEntries: StockEntry[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const stock = await queryRunner.manager.findOne(ProductStock, {
          where: { productId: item.productId, tenantId },
          lock: { mode: 'pessimistic_write' },
        });

        const requestedQty = Number(item.quantity);
        const availableQty = stock ? Number(stock.quantity) : 0;

        if (availableQty < requestedQty) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}: available ${availableQty}, requested ${requestedQty}`,
          );
        }

        stockEntries.push({ stock: stock!, item, product });
      }

      // 3. Calculate total from items (use provided unitPrice or product price)
      const itemsWithPrices = stockEntries.map(({ item, product }) => {
        const unitPrice = item.unitPrice ?? Number(product.price);
        const quantity = Number(item.quantity);
        const subtotal = parseFloat((unitPrice * quantity).toFixed(2));
        return { ...item, unitPrice, quantity, subtotal };
      });

      let total = itemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0);
      total = parseFloat(total.toFixed(2));

      // 4. Validate sum(payments) = total
      const paymentsTotal = dto.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const paymentsRounded = parseFloat(paymentsTotal.toFixed(2));

      if (Math.abs(paymentsRounded - total) > 0.01) {
        throw new UnprocessableEntityException({
          code: 'payment_mismatch',
          message: `Payment total (${paymentsRounded}) does not match sale total (${total})`,
        });
      }

      // 5. Deduct stock
      for (const { stock, item } of stockEntries) {
        stock.quantity = Number(stock.quantity) - Number(item.quantity);
        await queryRunner.manager.save(stock);
      }

      // 6. Record stock movements (OUT, reference=sale_id placeholder until we have sale id)
      // We'll update the referenceId after creating the sale
      const movementData: Partial<StockMovement>[] = stockEntries.map(
        ({ item, product }) => ({
          tenantId,
          productId: item.productId,
          type: 'OUT' as const,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? Number(product.price),
          reason: 'Sale',
          referenceType: 'sale',
          referenceId: null as string | null,
        }),
      );

      // Create movements (referenceId will be set after sale creation)
      const movements = movementData.map((data) =>
        queryRunner.manager.create(StockMovement, data),
      );

      // 7. Create Sale
      const sale = queryRunner.manager.create(Sale, {
        tenantId,
        customerId: dto.customerId ?? null,
        total,
        notes: dto.notes ?? null,
      });
      const savedSale = await queryRunner.manager.save(sale);

      // 8. Create SaleItems
      for (const item of itemsWithPrices) {
        const saleItem = queryRunner.manager.create(SaleItem, {
          tenantId,
          saleId: savedSale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        });
        await queryRunner.manager.save(saleItem);
      }

      // 9. Create Payments
      for (const paymentDto of dto.payments) {
        const payment = queryRunner.manager.create(Payment, {
          tenantId,
          saleId: savedSale.id,
          type: paymentDto.type,
          amount: paymentDto.amount,
        });
        await queryRunner.manager.save(payment);
      }

      // 10. Update stock movements with sale reference
      for (const movement of movements) {
        movement.referenceId = savedSale.id;
        await queryRunner.manager.save(movement);
      }

      // 11. Atomic invoice number generation
      const invoiceNumber = await this.generateInvoiceNumber(
        queryRunner,
        tenantId,
      );

      const invoice = queryRunner.manager.create(Invoice, {
        tenantId,
        saleId: savedSale.id,
        invoiceNumber,
      });
      await queryRunner.manager.save(invoice);

      await queryRunner.commitTransaction();

      // Return the complete sale with relations
      return this.saleRepository.findOne({
        where: { id: savedSale.id },
        relations: { items: true, payments: true, invoice: true, customer: true },
      }) as Promise<Sale>;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * List all sales for the current tenant.
   */
  async getAllSales(): Promise<Sale[]> {
    const tenantId = this.getTenantId();
    return this.saleRepository.find({
      where: { tenantId },
      relations: { items: true, payments: true, invoice: true, customer: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single sale by ID.
   */
  async getSaleById(id: string): Promise<Sale> {
    const tenantId = this.getTenantId();
    const sale = await this.saleRepository.findOne({
      where: { id, tenantId },
      relations: { items: true, payments: true, invoice: true, customer: true },
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  /**
   * Void a sale (soft void — sets voided_at, does NOT restore stock).
   * This is an accounting decision — stock adjustments are handled separately.
   */
  async voidSale(id: string): Promise<Sale> {
    const tenantId = this.getTenantId();
    const sale = await this.saleRepository.findOne({
      where: { id, tenantId },
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.voidedAt) {
      throw new BadRequestException('Sale is already voided');
    }

    sale.voidedAt = new Date();
    return this.saleRepository.save(sale);
  }

  /**
   * Atomically increment and return the next invoice number for a tenant.
   * Uses UPDATE ... RETURNING to ensure atomicity and prevent gaps.
   */
  private async generateInvoiceNumber(
    queryRunner: any,
    tenantId: string,
  ): Promise<string> {
    // Try to update existing sequence; if not found, insert a new one
    const result = await queryRunner.manager.query(
      `UPDATE tenant_sequences
       SET next_val = next_val + 1, updated_at = NOW()
       WHERE tenant_id = $1 AND sequence_name = 'invoice'
       RETURNING next_val`,
      [tenantId],
    );

    let nextVal: number;

    if (result.length === 0) {
      // Sequence doesn't exist — create it
      await queryRunner.manager.query(
        `INSERT INTO tenant_sequences (tenant_id, sequence_name, next_val, updated_at)
         VALUES ($1, 'invoice', 2, NOW())`,
        [tenantId],
      );
      nextVal = 1;
    } else {
      nextVal = Number(result[0].next_val);
    }

    // Format: INV-{tenant_short}-{YYYY}-{padded_number}
    const year = new Date().getFullYear();
    const padded = String(nextVal).padStart(8, '0');
    const tenantShort = tenantId.substring(0, 8);

    return `INV-${tenantShort}-${year}-${padded}`;
  }
}
