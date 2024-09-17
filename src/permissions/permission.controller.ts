import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dtos/createPermissionDto';
import { UpdatePermissionDto } from './dtos/updatePermission';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}
  @Post()
  create(@Body() permission: CreatePermissionDto): Promise<Permission> {
    return this.permissionService.create(permission);
  }
  @Get()
  findAll(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }
  @Post('managed-permissions')
  createManagedPermission(@Body() permission: CreatePermissionDto) {
    return this.permissionService.create(permission);
  }

  @Get(':permissionId')
  findOne(
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<Permission> {
    return this.permissionService.findOne(permissionId);
  }
  @Patch(':permissionId')
  update(
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @Body() permission: UpdatePermissionDto,
  ) {
    return this.permissionService.update(permissionId, permission);
  }
  @Delete(':permissionId')
  remove(@Param('permissionId', ParseIntPipe) permissionId: number) {
    return this.permissionService.remove(permissionId);
  }
}
