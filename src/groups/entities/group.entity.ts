import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Permission } from 'src/permissions/entities/permission.entity';
import { User } from 'src/users/entities/user.entity';
import { GroupPermission } from './group-permission.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission)
  @JoinTable()
  permissions: Permission[];
  @ManyToMany(() => User, (user) => user.groups)
  users: User[];
  @OneToMany(() => GroupPermission, (groupPermission) => groupPermission.group)
  groupPermissions: GroupPermission[];
}
