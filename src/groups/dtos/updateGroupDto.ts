import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './createGroupDto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
