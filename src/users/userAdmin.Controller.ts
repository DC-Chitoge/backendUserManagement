import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './user.service';
import { AuthGuard } from './../guards/auth.guard';
import { RoleGuard } from './../guards/role.guard';
import { ParseIntPipe } from '@nestjs/common';
import { GroupService } from './../groups/group.service';

@Controller('admin/users')
@UseGuards(AuthGuard, new RoleGuard(['rootadmin']))

// @Roles('admin')
export class UserAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly groupService: GroupService,
  ) {}

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

  @Get(':userId/groups')
  async getUserGroups(@Param('userId') userId: number) {
    const groups = await this.usersService.getUserGroups(userId);
    return { groups };
  }

  @Get('groups/:groupId/permissions')
  async getGroupPermissions(@Param('groupId') groupId: number) {
    const permissions = await this.usersService.getGroupPermissions(groupId);
    return { permissions };
  }

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

  @Post(':userId/permissions')
  async assignPermissionsToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { permissionIds: number[] },
  ) {
    const updatedUser = await this.usersService.assignPermissionsToUser(
      userId,
      body.permissionIds,
    );
    return {
      message: 'User permissions updated successfully',
      user: updatedUser,
    };
  }
  @Post(':userId/assign-group-and-permissions')
  async assignUserToGroupAndSetPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body()
    body: {
      groupId: number;
      permissionIds: number[];
    },
  ) {
    // Thêm người dùng vào nhóm
    await this.usersService.assignUserToGroups(userId, [body.groupId]);

    // Cập nhật quyền cho nhóm và đồng bộ hóa với các nhóm khác của người dùng
    const updatedGroup = await this.groupService.updateGroupPermissionsAndSync(
      body.groupId,
      body.permissionIds,
      userId,
    );

    // Lấy thông tin người dùng đã cập nhật
    const updatedUser = await this.usersService.findByUserId(userId);

    return {
      message: 'User added to group and permissions updated successfully',
      user: updatedUser,
      group: updatedGroup,
    };
  }
}
