import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export type CashSessionStatus = 'OPEN' | 'CLOSED';

@Entity('cash_sessions')
export class CashSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'opened_at', type: 'timestamptz', default: () => 'NOW()' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null = null;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingBalance!: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 12, scale: 2, nullable: true })
  closingBalance: number | null = null;

  @Column({ name: 'expected_balance', type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedBalance: number | null = null;

  @Column({ type: 'varchar', length: 10, default: 'OPEN' })
  status!: CashSessionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
