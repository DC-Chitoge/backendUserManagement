import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { GroupService } from './group.service';

import { UpdateGroupDto } from './dtos/updateGroupDto';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateGroupDto } from './dtos/createGroupDto';
import { AdminGuard } from 'src/guards/admin.guard';
import { UpdatePermissionDto } from 'src/permissions/dtos/updatePermission';
import { GroupPermissionService } from './group-permission.service';

@Controller('groups')
// @UseGuards(AuthGuard, AdminGuard)
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly groupPermissionService: GroupPermissionService,
  ) {}

  @Post('managed-groups')
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  @Get(':groupId')
  findOne(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.findOne(groupId);
  }

  @Patch(':groupId')
  update(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.update(groupId, updateGroupDto);
  }

  @Delete(':groupId')
  remove(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.remove(groupId);
  }
  // Lấy danh sách permissions của một group
  @Get(':groupId/get-permissions')
  async getGroupPermissions(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupService.getGroupPermissions(groupId);
  }

  // Thêm một permission vào group
  @Post(':groupId/permissions/:permissionId')
  async addPermissionToGroup(
    @Param('groupId') groupId: number,
    @Param('permissionId') permissionId: number,
  ) {
    return this.groupService.addPermissionToGroup(groupId, permissionId);
  }

  // Xóa một permission khỏi group
  @Delete(':groupId/permissions/:permissionId')
  async removePermissionFromGroup(
    @Param('groupId') groupId: number,
    @Param('permissionId') permissionId: number,
  ) {
    return this.groupService.removePermissionFromGroup(groupId, permissionId);
  }

  // Cập nhật toàn bộ danh sách permissions của group
  @Patch(':groupId/permissions')
  async updateGroupPermissions(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() updatePermissionDto: { id: number; isActive: boolean }[],
  ) {
    return this.groupService.updateGroupPermissions(
      groupId,
      updatePermissionDto,
    );
  }

  @Put(':groupId/permissions/:permissionId')
  async updateGroupPermission(
    @Param('groupId') groupId: number,
    @Param('permissionId') permissionId: number,
    @Body('isActive') isActive: boolean,
  ) {
    await this.groupPermissionService.updateGroupPermission(
      groupId,
      permissionId,
      isActive,
    );
    return { message: 'Group permission updated successfully' };
  }
}
