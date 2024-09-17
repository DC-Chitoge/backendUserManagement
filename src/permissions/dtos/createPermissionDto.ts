import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsNotEmpty()
  // @Transform(({ value }) =>
  //   value === 'true' ? true : value === 'false' ? false : value,
  // )
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isActive: boolean;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  groupId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  userIds: number[];
}
