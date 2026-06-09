import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { CashSession } from './cash-session.entity';

export type CashMovementType = 'IN' | 'OUT';

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => CashSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: CashSession;

  @Column({ type: 'varchar', length: 10 })
  type!: CashMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null = null;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string | null = null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
