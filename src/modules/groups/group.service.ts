import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from './dtos/createGroupDto';
import { UpdateGroupDto } from './dtos/updateGroupDto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Permission } from 'src/modules/permissions/entities/permission.entity';
import { Group } from './entities/group.entity';
import { In, Like, Repository } from 'typeorm';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    try {
      const existingGroup = await this.groupRepository.findOneBy({
        name: createGroupDto.name,
      });
      if (existingGroup) {
        throw new BadRequestException('Group name already exists');
      }

      const group = this.groupRepository.create(createGroupDto);

      const permissions = createGroupDto.permissionIds
        ? await this.permissionRepository.find({
            where: { id: In(createGroupDto.permissionIds) },
          })
        : [];

      const users = createGroupDto.userIds
        ? await this.userRepository.find({
            where: { id: In(createGroupDto.userIds) },
          })
        : [];

      group.permissions = permissions;
      group.users = users;

      return await this.groupRepository.save(group);
    } catch (error) {
      throw new BadRequestException('Error : ' + error.response.message);
    }
  }

  async update(
    groupId: number,
    updateGroupDto: UpdateGroupDto,
  ): Promise<Group> {
    try {
      const group = await this.groupRepository.findOneBy({ id: groupId });
      if (!group) {
        throw new NotFoundException(`Group with ID "${groupId}" not found`);
      }
      if (updateGroupDto.name) {
        group.name = updateGroupDto.name;
      }
      if (updateGroupDto.permissionIds) {
        group.permissions = await this.permissionRepository.find({
          where: { id: In(updateGroupDto.permissionIds) },
        });
      }
      if (updateGroupDto.userIds) {
        group.users = await this.userRepository.find({
          where: { id: In(updateGroupDto.userIds) },
        });
      }
      return this.groupRepository.save(group);
    } catch (error) {
      throw new BadRequestException('Error : ' + error.response.message);
    }
  }
  async findAll(): Promise<Group[]> {
    try {
      const allGroups = await this.groupRepository.find();
      if (!allGroups) {
        throw new NotFoundException('Groups not found');
      }
      return allGroups;
    } catch (error) {
      throw new BadRequestException('Error : ' + error.response.message);
    }
  }
  async findOne(groupId: number): Promise<Group> {
    try {
      const group = await this.groupRepository.findOneBy({ id: groupId });
      if (!group) {
        throw new NotFoundException(`Group with ID "${groupId}" not found`);
      }
      return group;
    } catch (error) {
      throw new BadRequestException('Error : ' + error.response.message);
    }
  }
  async findByName(groupName: string) {
    try {
      const groups = await this.groupRepository.find({
        where: { name: Like(`%${groupName}%`) },
      });

      if (groups.length === 0) {
        throw new NotFoundException(
          `No groups found with name containing "${groupName}"`,
        );
      }

      return groups;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async remove(groupId: number) {
    try {
      // Find the group to be deleted
      const groupToDelete = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['permissions', 'users'],
      });

      if (!groupToDelete) {
        throw new Error('Group not found');
      }
      // Cập nhật quyền của người dùng
      const users = groupToDelete.users;

      for (const user of users) {
        // Lấy quyền cho người dùng này
        const userPermissions = await this.permissionRepository.find({
          where: { users: { id: user.id } },
        });

        // Lấy quyền từ nhóm cần xóa
        const permissionsToRemove = groupToDelete.permissions;

        // Loại bỏ quyền nằm trong nhóm cần xóa
        user.permissions = userPermissions.filter(
          (permission) =>
            !permissionsToRemove.some((p) => p.id === permission.id),
        );

        // Lưu quyền người dùng đã cập nhật
        await this.userRepository.save(user);
      }

      // Cập nhật quyền thuộc về nhóm đã xóa
      for (const permission of groupToDelete.permissions) {
        // Loại bỏ nhóm đã xóa khỏi nhóm của quyền
        permission.group = null;
        await this.permissionRepository.save(permission);
      }

      await this.groupRepository.remove(groupToDelete);

      return {
        message: 'Group deleted and user permissions updated successfully',
      };
    } catch (error) {
      throw new BadRequestException('Error: ' + error.response.message);
    }
  }
  async removePermissionFromGroup(groupId: number, permissionId: number) {
    try {
      // Tìm nhóm và lấy quyền liên quan cùng người dùng
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['permissions', 'users'],
      });
      if (!group) {
        throw new NotFoundException('Group not found');
      }
      // Kiểm tra xem quyền có tồn tại trong nhóm không
      if (!Array.isArray(group.permissions)) {
        group.permissions = [];
      }

      const permissionExists = group.permissions.some(
        (p) => p.id === permissionId,
      );
      if (!permissionExists) {
        console.warn(
          `Permission ID ${permissionId} does not exist in the group`,
        );
        throw new BadRequestException('Permission does not exist in the group');
      }

      // Loại bỏ quyền khỏi nhóm
      group.permissions = group.permissions.filter(
        (p) => p.id !== permissionId,
      );
      await this.groupRepository.save(group);

      // Tìm tất cả người dùng thuộc nhóm này
      const users = group.users || [];
      // Cập nhật quyền của từng người dùng
      for (const user of users) {
        // Tìm tất cả các nhóm mà người dùng thuộc về
        const userGroups = await this.groupRepository.find({
          where: { users: { id: user.id } },
          relations: ['permissions'],
        });
        // Kiểm tra xem quyền này còn tồn tại trong các nhóm khác không
        const isPermissionInOtherGroups = userGroups.some((ug) =>
          ug.permissions.some((p) => p.id === permissionId),
        );
        const userPermissions = await this.userRepository.findOne({
          where: { id: user.id },
          relations: ['permissions'],
        });
        // Nếu quyền không còn trong các nhóm khác, loại bỏ quyền đó khỏi người dùng
        if (!isPermissionInOtherGroups) {
          // Ensure user.permissions is defined
          if (!Array.isArray(userPermissions.permissions)) {
            userPermissions.permissions = [];
          }
          const afterPermissions = userPermissions.permissions.filter(
            (p) => p.id !== permissionId,
          );
          await this.userRepository.save(afterPermissions);
        }
      }

      return {
        message: 'Permission removed from group and users successfully',
        group,
      };
    } catch (error) {
      throw new BadRequestException('Error : ' + error.response.message);
    }
  }
}
