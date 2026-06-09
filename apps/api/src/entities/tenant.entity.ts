import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  name!: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  slug!: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null = null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users?: User[];

  @OneToMany(() => Role, (role) => role.tenant)
  roles?: Role[];
}
