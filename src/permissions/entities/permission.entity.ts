import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from 'src/groups/entities/group.entity';
import { User } from 'src/users/entities/user.entity';
import { GroupPermission } from 'src/groups/entities/group-permission.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  isActive: boolean;

  @ManyToOne(() => Group, (group) => group.permissions)
  group: Group;
  @ManyToMany(() => User, (user) => user.permissions)
  users: User[];
  @OneToMany(
    () => GroupPermission,
    (groupPermission) => groupPermission.permission,
  )
  groupPermissions: GroupPermission[];
}
