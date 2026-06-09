import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Customer } from './customer.entity';
import { SaleItem } from './sale-item.entity';
import { Payment } from './payment.entity';
import { Invoice } from './invoice.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null = null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null = null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date | null = null;

  @Column({ type: 'text', nullable: true })
  notes: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items!: SaleItem[];

  @OneToMany(() => Payment, (payment) => payment.sale, { cascade: true })
  payments!: Payment[];

  @OneToOne(() => Invoice, (invoice) => invoice.sale)
  invoice!: Invoice;
}
