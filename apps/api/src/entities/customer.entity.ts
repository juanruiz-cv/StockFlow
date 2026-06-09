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

@Entity('clientes')
@Unique(['tenantId', 'email'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null = null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null = null;

  @Column({ name: 'document_type', type: 'varchar', length: 20, nullable: true })
  documentType: string | null = null;

  @Column({ name: 'document_number', type: 'varchar', length: 20, nullable: true })
  documentNumber: string | null = null;

  @Column({ type: 'text', nullable: true })
  address: string | null = null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
