import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, In } from 'typeorm';
import { UpdateUserDto } from './dtos/updateUserDto';
import { RegisterUserDto } from './dtos/registerUserDto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Permission } from 'src/permissions/entities/permission.entity';
import { Group } from 'src/groups/entities/group.entity';
import { UserPermissionChecker } from './helper/checkUserPermissionChecker';
import { UserCacheService } from './userCache.service';
import { CurrentUser } from './decorators/user.decorator';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private userCacheService: UserCacheService,
  ) {}
  createUser(requestBody: RegisterUserDto) {
    try {
      const user = this.usersRepository.create(requestBody);
      return this.usersRepository.save(user);
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }
  async findAll() {
    try {
      return await this.usersRepository.find();
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }
  async findByUserId(userId: number) {
    try {
      const user = await this.usersRepository.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      throw new BadRequestException('Error :' + error.response.message);
    }
  }
  async findByEmail(email: string) {
    try {
      return await this.usersRepository.findOneBy({ email });
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }
  async updateByUserId(
    userId: number,
    requestBody: UpdateUserDto,
    currentUser: User,
  ) {
    try {
      const user = await this.usersRepository.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      UserPermissionChecker.check('update', currentUser, user, userId);
      const updatedUser = await this.usersRepository.save({
        ...user,
        ...requestBody,
      });
      return {
        message: 'Update user successfully',
        user: updatedUser,
      };
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  async deleteByUserId(userId: number, currentUser: User) {
    try {
      const userToDelete = await this.findByUserId(userId);
      if (!userToDelete) {
        throw new NotFoundException('User not found');
      }

      UserPermissionChecker.check('delete', currentUser, userToDelete, userId);

      await this.usersRepository.delete({ id: userId });
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  //* avatar
  async updateAvatar(userId: number, file: Express.Multer.File): Promise<User> {
    try {
      const user = await this.usersRepository.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Delete old avatar if exists
      if (user.avatarUrl) {
        const oldAvatarPath = path.join(uploadsDir, user.avatarUrl);
        await fs.unlink(oldAvatarPath).catch((error) => {
          console.error('Error deleting old avatar:', error);
        });
      }

      // Save new avatar
      const avatarUrl = `${Date.now()}-${file.originalname}`;
      const newAvatarPath = path.join(uploadsDir, avatarUrl);
      await fs.writeFile(newAvatarPath, file.buffer);

      // Update user in database
      user.avatarUrl = avatarUrl;
      await this.usersRepository.save(user);
      return user;
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw new BadRequestException(
        `Failed to update avatar: ${error.response.message}`,
      );
    }
  }

  async deleteAvatar(userId: number): Promise<User> {
    try {
      const user = await this.findByUserId(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.avatarUrl) {
        await fs.unlink(`uploads/${user.avatarUrl}`);
        user.avatarUrl = null;
        return this.usersRepository.save(user);
      }

      return user;
    } catch (error) {
      throw new BadRequestException('Failed to delete avatar');
    }
  }

  async getUserPermissions(userId: number) {
    try {
      const userPermissions = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.permissions', 'permission')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!userPermissions) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      const permissions = userPermissions.permissions.map(
        (permission) => permission.name,
      );
      return permissions;
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  async assignUserToGroups(userId: number, groupIds: number[]): Promise<User> {
    try {
      if (groupIds.length === 0) {
        throw new BadRequestException('GroupIds cannot be empty!');
      }
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['groups'],
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const groups = await this.groupRepository.findBy({ id: In(groupIds) });
      // Kết hợp nhóm cũ và mới
      user.groups = [...new Set([...user.groups, ...groups])];
      await this.usersRepository.save(user);

      // Fetch the updated user with groups
      return this.usersRepository.findOne({
        where: { id: userId },
        relations: ['groups'],
      });
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['groups'],
      });
      if (!user) {
        throw new BadRequestException('User does not exist');
      }
      return user ? user.groups : [];
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  async getGroupPermissions(groupId: number): Promise<Permission[]> {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['permissions'],
      });
      if (!group) {
        throw new BadRequestException('Group does not exist');
      }
      return group ? group.permissions : [];
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  async updateGroupPermissions(
    groupId: number,
    permissionIds: number[],
  ): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    const existingPermissions = group.permissions.map((p) => p.id);
    const duplicatePermissionIds = permissionIds.filter((id) =>
      existingPermissions.includes(id),
    );
    if (duplicatePermissionIds.length > 0) {
      throw new BadRequestException(
        `Permissions with IDs ${duplicatePermissionIds.join(
          ', ',
        )} already exist in the group.`,
      );
    }
    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });
    group.permissions = [...new Set([...group.permissions, ...permissions])];
    return this.groupRepository.save(group);
  }
  async assignUserToGroupAndSetPermissions(
    userId: number,
    groupId: number,
    permissionIds: number[],
  ): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['groups', 'permissions'],
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['permissions'],
      });
      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Check if all permissionIds belong to the group
      const groupPermissionIds = group.permissions.map((p) => p.id);
      const invalidPermissionIds = permissionIds.filter(
        (id) => !groupPermissionIds.includes(id),
      );

      if (invalidPermissionIds.length > 0) {
        throw new BadRequestException(
          `Permissions with IDs ${invalidPermissionIds.join(
            ', ',
          )} do not belong to the specified group`,
        );
      }

      const newPermissions = await this.permissionRepository.find({
        where: { id: In(permissionIds) },
      });

      // Ensure the group is added without removing existing groups
      if (!user.groups.some((g) => g.id === group.id)) {
        user.groups.push(group); // Ensure existing groups are retained
      }

      // Add new permissions without removing existing ones
      const existingPermissionIds = user.permissions.map((p) => p.id);
      newPermissions.forEach((permission) => {
        if (!existingPermissionIds.includes(permission.id)) {
          user.permissions.push(permission);
        }
      });

      await this.usersRepository.save(user);
      return this.findByUserId(userId);
    } catch (error) {
      throw new BadRequestException('Error : ' + error.response.message);
    }
  }

  async removePermissionFromUser(userId: number, permissionIds: number[]) {
    try {
      // Log permission IDs if necessary
      if (permissionIds.length > 0) {
        console.log('Permission IDs:', permissionIds);
      }

      // Fetch user by userId
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['permissions'], // Ensure permissions are loaded
      });
      if (!user) throw new BadRequestException('User does not exist');

      // Validate permissionIds
      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        throw new BadRequestException(
          'Permission IDs must be a non-empty array',
        );
      }

      // Fetch all available permissions in the system
      const allPermissions = await this.permissionRepository.find();
      const allPermissionIds = allPermissions.map((p) => p.id);

      // Check if all permissionIds are valid
      const invalidPermissionIds = permissionIds.filter(
        (id) => !allPermissionIds.includes(id),
      );
      if (invalidPermissionIds.length > 0) {
        throw new BadRequestException(
          `The following permission IDs do not exist: ${invalidPermissionIds.join(
            ', ',
          )}`,
        );
      }
      // Get user's current permissions
      const userPermissions = user.permissions ? user.permissions : [];
      console.log('test :', userPermissions);
      // Identify permissions that exist in both permissionIds and user's current permissions
      const permissionsToRemove = userPermissions.filter((p) =>
        permissionIds.includes(p.id),
      );
      // Check if there are any permissions to remove
      if (permissionsToRemove.length === 0) {
        throw new BadRequestException(
          `No matching permissions found to remove for permission IDs: ${permissionIds.join(
            ', ',
          )}`,
        );
      }

      // Remove the identified permissions from the user's current permissions
      const updatedPermissions = userPermissions.filter(
        (p) => !permissionIds.includes(p.id),
      );

      // Check if there is any actual change
      if (updatedPermissions.length === userPermissions.length) {
        return {
          message: 'No permissions were removed, no changes made',
        };
      }

      // Update user's permissions and save
      user.permissions = updatedPermissions;
      await this.usersRepository.save(user);

      return {
        message: 'Permissions removed from user successfully',
        removedPermissions: permissionsToRemove.map((p) => p.id),
      };
    } catch (error) {
      console.error('Error removing permissions:', error);
      throw new BadRequestException(error.message);
    }
  }
  async removeGroupsFromUser(userId: number, groupIds: number[]) {
    try {
      const isUserExist = await this.findByUserId(userId);
      if (!isUserExist) {
        throw new NotFoundException('User not found');
      }
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['groups', 'permissions'],
      });
      console.log('check before user', user);
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        throw new BadRequestException('groupIds must be a non-empty array');
      }

      const groups = await this.groupRepository.findBy({
        id: In(groupIds),
      });
      // Xác định các nhóm người dùng hiện có
      const existingGroups = user.groups.map((group) => group.id);

      // Xác định nhóm cần loại bỏ có nhóm nào trong nhóm của người dùng cần xóa nhóm không
      const groupsToRemove = groupIds.filter((groupId) =>
        existingGroups.includes(groupId),
      );
      // Kiểm tra xem có nhóm nào cần loại bỏ không có trong nhóm của người dùng
      const invalidGroups = groupIds.filter(
        (groupId) => !existingGroups.includes(groupId),
      );
      if (groups.length !== groupIds.length) {
        throw new BadRequestException(
          `Some groupIds are invalid : ${invalidGroups.join(', ')}`,
        );
      }

      if (invalidGroups.length > 0) {
        throw new BadRequestException(
          `Groups with IDs ${invalidGroups.join(
            ', ',
          )} do not exist for this user`,
        );
      }
      // Cập nhật danh sách nhóm của người dùng sau khi loại bỏ các nhóm cần thiết
      user.groups = user.groups.filter(
        (group) => !groupsToRemove.includes(group.id),
      );

      // Xử lý các quyền sau khi loại bỏ nhóm:
      // Lấy tất cả các quyền của nhóm bị loại bỏ
      const removedGroupPermissions = new Set<number>();
      for (const group of groupsToRemove) {
        const groupPermissions = await this.getGroupPermissions(group);
        groupPermissions.forEach((permission) =>
          removedGroupPermissions.add(permission.id),
        );
      }

      // Lấy tất cả các quyền từ các nhóm còn lại của người dùng
      const remainingGroupPermissions = new Set<number>();
      for (const group of user.groups) {
        const groupPermissions = await this.getGroupPermissions(group.id);
        groupPermissions.forEach((permission) =>
          remainingGroupPermissions.add(permission.id),
        );
      }

      // Xóa quyền thuộc các nhóm đã xóa, nhưng chỉ nếu quyền đó không còn thuộc nhóm còn lại
      user.permissions = user.permissions.filter(
        (permission) =>
          !removedGroupPermissions.has(permission.id) ||
          remainingGroupPermissions.has(permission.id),
      );
      await this.usersRepository.save(user);
      return { message: 'Groups removed from user succesfully' };
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }
}
