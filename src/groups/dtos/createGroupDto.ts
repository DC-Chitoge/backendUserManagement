import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  userIds: number[];
}
