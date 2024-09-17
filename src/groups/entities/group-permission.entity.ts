import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Group } from './group.entity';
import { Permission } from 'src/permissions/entities/permission.entity';

@Entity()
export class GroupPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group, (group) => group.groupPermissions)
  group: Group;

  @ManyToOne(() => Permission, (permission) => permission.groupPermissions)
  permission: Permission;

  @Column()
  isActive: boolean;
}
