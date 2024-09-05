import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
export enum Role {
  USER = 'USER',
  MOD = 'MOD',
  ADMIN = 'ADMIN',
}
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
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
}
