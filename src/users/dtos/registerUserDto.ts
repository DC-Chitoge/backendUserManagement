import { IsNotEmpty, IsEmail, IsString } from 'class-validator';
import { Role } from '../entities/user.entity';
import { PartialType } from '@nestjs/mapped-types';

export class RegisterUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsNotEmpty()
  @IsString()
  password: string;
  @IsNotEmpty()
  firstName: string;
  @IsNotEmpty()
  lastName: string;
  role: Role;
}
