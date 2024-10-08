import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dtos/createPermissionDto';
import { UpdatePermissionDto } from './dtos/updatePermission';
import { AuthGuard } from 'src/guards/auth.guard';
import { RoleGuard } from 'src/guards/role.guard';

@Controller('permissions')
@UseGuards(AuthGuard, new RoleGuard(['rootadmin']))
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
  @Post()
  createManagedPermission(@Body() permission: CreatePermissionDto) {
    return this.permissionService.create(permission);
  }

  @Get(':permissionId')
  findOne(
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<Permission> {
    return this.permissionService.findOne(permissionId);
  }
  @Post('findByName')
  findByName(@Body('permissionName') permissionName: string) {
    return this.permissionService.findByName(permissionName);
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
