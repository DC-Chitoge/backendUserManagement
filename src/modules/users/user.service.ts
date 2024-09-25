import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, In, Like } from 'typeorm';
import { UpdateUserDto } from './dtos/updateUserDto';
import { RegisterUserDto } from './dtos/registerUserDto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Permission } from 'src/modules/permissions/entities/permission.entity';
import { Group } from 'src/modules/groups/entities/group.entity';
import { UserPermissionChecker } from './helper/checkUserPermissionChecker';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UsersService {
  private userCache: Map<number, User> = new Map();
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}
  setUser(userId: number, user: User) {
    this.userCache.set(userId, user);
  }

  getUser(userId: number): User | undefined {
    return this.userCache.get(userId);
  }

  clearUser(userId: number) {
    this.userCache.delete(userId);
  }
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
  async findByName(name: string) {
    if (!name || name.trim() === '')
      throw new BadRequestException(
        'Name parameter must be a non-empty string',
      );
    try {
      const users = await this.usersRepository.find({
        where: [
          { firstName: Like(`%${name}%`) }, // Tìm kiếm trong firstName
          { lastName: Like(`%${name}%`) }, // Tìm kiếm trong lastName
        ],
      });

      if (users.length === 0) {
        throw new NotFoundException(
          `No users found with name containing "${name}"`,
        );
      }

      // Trả về danh sách người dùng đã tìm thấy
      return users.map((user) => {
        const { password, ...result } = user; // Loại bỏ password nếu cần
        return result; // Trả về chỉ dữ liệu người dùng liên quan
      });
    } catch (error) {
      throw new BadRequestException(error.message);
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
      if (
        userId === currentUser.id &&
        ['admin', 'rootadmin'].includes(requestBody.role?.toLowerCase())
      ) {
        throw new ForbiddenException(
          'You cannot update your role to admin or rootadmin',
        );
      }
      UserPermissionChecker.verifyUserActionPermissions(
        'update',
        currentUser,
        user,
        userId,
      );
      const updatedUser = await this.usersRepository.save({
        ...user,
        ...requestBody,
      });
      return {
        message: 'Update user successfully',
        user: updatedUser,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteByUserId(userId: number, currentUser: User) {
    try {
      const userToDelete = await this.findByUserId(userId);
      if (!userToDelete) {
        throw new NotFoundException('User not found');
      }

      UserPermissionChecker.verifyUserActionPermissions(
        'delete',
        currentUser,
        userToDelete,
        userId,
      );

      await this.usersRepository.delete({ id: userId });
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error.response.message);
    }
  }

  //* avatar
  async updateAvatar(
    userId: number,
    currentUser: User,
    file: Express.Multer.File,
  ): Promise<User> {
    try {
      const user = await this.usersRepository.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (userId !== currentUser.id) {
        throw new ForbiddenException(
          'You are not authorized to update this avatar',
        );
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

  async deleteAvatar(userId: number, currentUser: User): Promise<User> {
    try {
      const user = await this.findByUserId(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (userId !== currentUser.id) {
        throw new ForbiddenException(
          'You are not authorized to delete this avatar',
        );
      }
      if (user.avatarUrl) {
        await fs.unlink(`uploads/${user.avatarUrl}`);
        user.avatarUrl = null;
        return this.usersRepository.save(user);
      }

      return user;
    } catch (error) {
      throw new BadRequestException(error.response.message);
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
      if (!user.groups.some((g) => g.id === group.id)) {
        user.groups.push(group);
      }
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
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['permissions'],
      });
      if (!user) throw new BadRequestException('User does not exist');

      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        throw new BadRequestException(
          'Permission IDs must be a non-empty array',
        );
      }
      const allPermissions = await this.permissionRepository.find();
      const allPermissionIds = allPermissions.map((p) => p.id);
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
      const userPermissions = user.permissions ? user.permissions : [];
      const permissionsToRemove = userPermissions.filter((p) =>
        permissionIds.includes(p.id),
      );
      if (permissionsToRemove.length === 0) {
        throw new BadRequestException(
          `No matching permissions found to remove for permission IDs: ${permissionIds.join(
            ', ',
          )}`,
        );
      }
      const updatedPermissions = userPermissions.filter(
        (p) => !permissionIds.includes(p.id),
      );
      if (updatedPermissions.length === userPermissions.length) {
        return {
          message: 'No permissions were removed, no changes made',
        };
      }
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
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        throw new BadRequestException('groupIds must be a non-empty array');
      }
      // Lấy danh sách các nhóm hợp lệ và kiểm tra sự tồn tại của các groupIds
      const groupsToRemove = await this.groupRepository
        .createQueryBuilder('group')
        .where('group.id IN (:...groupIds)', { groupIds })
        .getMany();

      if (groupsToRemove.length !== groupIds.length) {
        const invalidGroupIds = groupIds.filter(
          (id) => !groupsToRemove.some((group) => group.id === id),
        );
        throw new BadRequestException(
          `Some groupIds are invalid: ${invalidGroupIds.join(', ')}`,
        );
      }

      // Loại bỏ nhóm khỏi user
      await this.usersRepository
        .createQueryBuilder()
        .relation(User, 'groups')
        .of(user.id)
        .remove(groupsToRemove.map((group) => group.id));

      // Lấy danh sách quyền bị loại bỏ từ các nhóm đã xóa
      const removedGroupPermissions = await this.permissionRepository
        .createQueryBuilder('permission')
        .leftJoin('permission.groups', 'group')
        .where('group.id IN (:...groupIds)', { groupIds })
        .getMany();

      // Xóa quyền khỏi người dùng nếu chúng không còn trong nhóm nào khác
      await this.usersRepository
        .createQueryBuilder()
        .relation(User, 'permissions')
        .of(user.id)
        .remove(removedGroupPermissions.map((permission) => permission.id));
      return { message: 'Groups removed from user succesfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
