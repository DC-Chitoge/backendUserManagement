import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Group } from './../../groups/entities/group.entity';
import { Permission } from 'src/permissions/entities/permission.entity';
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  ROOTADMIN = 'ROOTADMIN',
}
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;
  @Column()
  firstName: string;
  @Column()
  lastName: string;

  @Column()
  @Exclude() //interceptors
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
    // Add this line
  })
  @Exclude()
  role: Role;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpires: Date;
  @Column({ nullable: true })
  refreshToken: string;
  @Column({ nullable: true })
  avatarUrl: string;

  @ManyToMany(() => Group, (group) => group.users)
  groups: Group[];
  @ManyToMany(() => Permission, (permission) => permission.users)
  @JoinTable()
  permissions: Permission[];
}
