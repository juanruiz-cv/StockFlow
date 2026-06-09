import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Category } from './category.entity';
import { Brand } from './brand.entity';
import { Supplier } from './supplier.entity';

@Entity('productos')
@Unique(['tenantId', 'sku'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null = null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null = null;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null = null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null = null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId: string | null = null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null = null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'text', nullable: true })
  description: string | null = null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column({ name: 'cost_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costPrice: number | null = null;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 21.00 })
  taxRate: number = 21.00;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
