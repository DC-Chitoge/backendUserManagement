import { IsNotEmpty, IsEmail, MinLength, IsString } from 'class-validator';
import { Role } from '../entities/user.entity';
export class RegisterUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;
  @MinLength(6)
  @IsNotEmpty()
  password: string;
  @IsString()
  @IsNotEmpty()
  firstName: string;
  @IsString()
  @IsNotEmpty()
  lastName: string;
  role: Role;
}
