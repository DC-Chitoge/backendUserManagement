import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from 'src/modules/groups/entities/group.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Group, (group) => group.permissions)
  groups: Group[];
  @ManyToMany(() => User, (user) => user.permissions)
  users: User[];
}
