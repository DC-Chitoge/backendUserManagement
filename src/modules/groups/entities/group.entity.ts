import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Permission } from 'src/modules/permissions/entities/permission.entity';
import { User } from 'src/modules/users/entities/user.entity';
@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission, (permission) => permission.groups)
  @JoinTable()
  permissions: Permission[];
  @JoinTable()
  @ManyToMany(() => User, (user) => user.groups)
  users: User[];
}
