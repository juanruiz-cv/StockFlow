import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  resource!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
  rolePermissions?: RolePermission[];
}
