import { OmitType, PartialType } from '@nestjs/mapped-types';
import { RegisterUserDto } from './registerUserDto';

export class UpdateUserDto extends PartialType(
  OmitType(RegisterUserDto, ['password'] as const),
) {}
