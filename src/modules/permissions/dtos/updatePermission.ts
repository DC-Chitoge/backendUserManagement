import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './createPermissionDto';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}
