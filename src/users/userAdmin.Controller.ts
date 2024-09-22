import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseFilters,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { AuthGuard } from './../guards/auth.guard';
import { RoleGuard } from './../guards/role.guard';
import { GroupService } from './../groups/group.service';
import { HttpExceptionFilter } from 'src/exception-filters/http-exception.filter';
import { UserCacheService } from './userCache.service';
import { CurrentUser } from './decorators/user.decorator';
import { User } from './entities/user.entity';

@Controller('rootadmin')
@UseGuards(AuthGuard, new RoleGuard(['rootadmin']))
@UseFilters(HttpExceptionFilter)

// @Roles('admin')
export class UserAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly groupService: GroupService,
    private readonly userCacheService: UserCacheService,
  ) {}

  // thêm group cho user
  @Post(':userId/groups')
  async assignUserToGroups(
    @Param('userId') userId: number,
    @Body() body: { groupIds: number[] },
  ) {
    const updatedUser = await this.usersService.assignUserToGroups(
      userId,
      body.groupIds,
    );
    return { message: 'User groups updated successfully', user: updatedUser };
  }
  // lấy tất cả group của user
  @Get(':userId/groups')
  async getUserGroups(@Param('userId') userId: number) {
    const groups = await this.usersService.getUserGroups(userId);
    return { groups };
  }

  // lấy tất cả quyền của group
  @Get('groups/:groupId/permissions')
  async getGroupPermissions(@Param('groupId') groupId: number) {
    const permissions = await this.usersService.getGroupPermissions(groupId);
    return { permissions };
  }

  // cập nhật quyền cho group
  @Post('groups/:groupId/permissions')
  async updateGroupPermissions(
    @Param('groupId') groupId: number,
    @Body() body: { permissionIds: number[] },
  ) {
    const updatedGroup = await this.usersService.updateGroupPermissions(
      groupId,
      body.permissionIds,
    );
    return {
      message: 'Group permissions updated successfully',
      group: updatedGroup,
    };
  }
  // Xóa một permission khỏi group

  @Delete('groups/:groupId/permissions/:permissionId')
  async removePermissionFromGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.groupService.removePermissionFromGroup(groupId, permissionId);
  }
  //lấy các quyền user
  @Get(':userId/permissions')
  async getUserPermissions(@Param('userId', ParseIntPipe) userId: number) {
    const permissions = await this.usersService.getUserPermissions(userId);
    return { permissions };
  }
  // Xóa quyền của user
  @Delete(':userId/permissions')
  async removePermissionFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { permissionIds: number[] },
  ) {
    return this.usersService.removePermissionFromUser(
      userId,
      body.permissionIds,
    );
  }
  // cập nhật quyền group cho user
  @Post(':userId/assign-group-and-permissions')
  async assignUserToGroupAndSetPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body()
    body: {
      groupId: number;
      permissionIds: number[];
    },
  ) {
    const updatedUser =
      await this.usersService.assignUserToGroupAndSetPermissions(
        userId,
        body.groupId,
        body.permissionIds,
      );

    const updatedGroup = await this.getUserGroups(userId);
    const permissions = await this.getUserPermissions(userId);
    return {
      message: 'User added to group and permissions updated successfully',
      user: { id: updatedUser.id, email: updatedUser.email },
      group: updatedGroup,
      permissions: permissions,
    };
  }

  //delete groups from user
  @Delete(':userId/groups')
  async removeGroupsFromUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { groupIds: number[] },
  ) {
    return this.usersService.removeGroupsFromUser(userId, body.groupIds);
  }
}
