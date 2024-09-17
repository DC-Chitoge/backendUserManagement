import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dtos/updateUserDto';
import { RegisterUserDto } from './dtos/registerUserDto';
import { AdminPermission } from './helper/admin.permission';
import { UpdatePermission } from './helper/update.permission';
import * as fs from 'fs/promises';
import * as path from 'path';
import { In } from 'typeorm';
import { Permission } from 'src/permissions/entities/permission.entity';
import { Group } from 'src/groups/entities/group.entity';
import { GroupPermission } from 'src/groups/entities/group-permission.entity';
import { GroupPermissionService } from '../groups/group-permission.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupPermission)
    private groupPermissionService: GroupPermissionService,
  ) {}
  createUser(requestBody: RegisterUserDto) {
    const user = this.usersRepository.create(requestBody);
    return this.usersRepository.save(user);
  }
  async findAll() {
    return this.usersRepository.find();
  }
  findByUserId(userId: number) {
    return this.usersRepository.findOneBy({ id: userId });
  }
  findByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }
  async updateByUserId(
    userId: number,
    requestBody: UpdateUserDto,
    currentUser: User,
  ) {
    try {
      let user = await this.findByUserId(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      // console.log('check>>> currentUser :', currentUser);
      if (
        requestBody.role &&
        currentUser.role.toLocaleLowerCase() !== 'rootadmin'
      ) {
        throw new BadRequestException('Only ROOTADMIN can update role');
      }
      if (
        requestBody.role &&
        requestBody.role.toLocaleLowerCase() === 'rootadmin'
      ) {
        throw new BadRequestException('ROOTADMIN role cannot be assigned');
      }

      UpdatePermission.check(userId, currentUser);
      user = { ...user, ...requestBody };
      const updateUser = await this.usersRepository.save(user);
      return {
        message: 'Update user successfully',
        user: updateUser,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  deleteByUserId(userId: number, currentUser: User) {
    const check = AdminPermission.check(currentUser);
    console.log(check);
    return this.usersRepository.delete({ id: userId });
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
        await fs.unlink(oldAvatarPath).catch(() => {});
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
        `Failed to update avatar: ${error.message}`,
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
  async addUserToGroup(userId: number, groupId: number): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });
    user.groups.push({ id: groupId } as any);
    await this.usersRepository.save(user);
  }
  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: [
        'groups',
        'groups.groupPermissions',
        'groups.groupPermissions.permission',
      ],
    });
    const permissions = new Set<string>();
    user.groups.forEach((group) => {
      group.groupPermissions
        .filter((gp) => gp.isActive)
        .forEach((gp) => permissions.add(gp.permission.name));
    });
    return Array.from(permissions);
  }

  async assignUserToGroups(userId: number, groupIds: number[]): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });
    if (!user) {
      throw new Error('User not found');
    }

    const groups = await this.groupRepository.find({
      where: { id: In(groupIds) },
    });
    user.groups = groups;
    return this.usersRepository.save(user);
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });
    return user ? user.groups : [];
  }

  async getGroupPermissions(groupId: number): Promise<Permission[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
    return group ? group.permissions : [];
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
      throw new Error('Group not found');
    }

    const permissions = await this.permissionRepository.findByIds(
      permissionIds,
    );
    group.permissions = permissions;
    return this.groupRepository.save(group);
  }

  async getUserDetailedPermissions(
    userId: number,
  ): Promise<{ [key: string]: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: [
        'groups',
        'groups.groupPermissions',
        'groups.groupPermissions.permission',
      ],
    });

    const permissions = {};
    user.groups.forEach((group) => {
      group.groupPermissions.forEach((gp) => {
        permissions[gp.permission.name] = gp.isActive;
      });
    });

    return permissions;
  }

  async updateUserPermissions(
    userId: number,
    permissions: { [key: string]: boolean },
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });

    const permissionEntities = await this.permissionRepository.find();
    const permissionMap = new Map(
      permissionEntities.map((p) => [p.name, p.id]),
    );

    for (const [permissionName, isActive] of Object.entries(permissions)) {
      const permissionId = permissionMap.get(permissionName);
      if (permissionId) {
        for (const group of user.groups) {
          await this.groupPermissionService.updateGroupPermission(
            group.id,
            permissionId,
            isActive,
          );
        }
      }
    }
  }
  async assignPermissionsToUser(
    userId: number,
    permissionIds: number[],
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['permissions'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    user.permissions = permissions;
    return this.usersRepository.save(user);
  }
}
