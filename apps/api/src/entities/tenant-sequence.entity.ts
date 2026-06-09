import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_sequences')
@Unique(['tenantId', 'sequenceName'])
export class TenantSequence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'sequence_name', type: 'varchar', length: 50 })
  sequenceName!: string;

  @Column({ name: 'next_val', type: 'bigint', default: 1 })
  nextVal!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
