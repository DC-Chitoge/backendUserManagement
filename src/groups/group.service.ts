import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGroupDto } from './dtos/createGroupDto';
import { UpdateGroupDto } from './dtos/updateGroupDto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Permission } from 'src/permissions/entities/permission.entity';
import { Group } from './entities/group.entity';
import { In, Repository } from 'typeorm';

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
    const group = this.groupRepository.create(createGroupDto);
    if (createGroupDto.permissionIds) {
      group.permissions = await this.permissionRepository.find({
        where: { id: In(createGroupDto.permissionIds) },
      });
    }
    if (createGroupDto.userIds) {
      group.users = await this.userRepository.find({
        where: { id: In(createGroupDto.userIds) },
      });
    }
    return this.groupRepository.save(group);
  }

  async update(
    groupId: number,
    updateGroupDto: UpdateGroupDto,
  ): Promise<Group> {
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
  }
  async findAll(): Promise<Group[]> {
    return this.groupRepository.find();
  }
  async findOne(groupId: number): Promise<Group> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found`);
    }
    return group;
  }
  async remove(groupId: number) {
    await this.groupRepository.delete({ id: groupId });
    return { message: 'Group deleted successfully' };
  }
  async getGroupPermissions(groupId: number): Promise<Permission[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
    return group.permissions;
  }
  async addPermissionToGroup(
    groupId: number,
    permissionId: number,
  ): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });
    if (!group || !permission) {
      throw new NotFoundException('Group or permission not found');
    }
    group.permissions.push(permission);
    return this.groupRepository.save(group);
  }
  async removePermissionFromGroup(
    groupId: number,
    permissionId: number,
  ): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });
    if (!group || !permission) {
      throw new NotFoundException('Group or permission not found');
    }
    group.permissions = group.permissions.filter((p) => p.id !== permissionId);
    return this.groupRepository.save(group);
  }
  async updateGroupPermissions(
    groupId: number,
    permissionUpdates: { id: number; isActive: boolean }[],
  ): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions', 'users'],
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const updateMap = new Map(
      permissionUpdates.map((update) => [update.id, update.isActive]),
    );

    // Update permissions for the current group
    for (const update of permissionUpdates) {
      const permission = await this.permissionRepository.findOne({
        where: { id: update.id },
      });
      if (permission) {
        if (update.isActive) {
          if (!group.permissions.some((p) => p.id === permission.id)) {
            group.permissions.push(permission);
          }
        } else {
          group.permissions = group.permissions.filter(
            (p) => p.id !== permission.id,
          );
        }
      }
    }

    // Save the updated group
    await this.groupRepository.save(group);

    // Update permissions for other groups of users in this group
    for (const user of group.users) {
      const userGroups = await this.groupRepository.find({
        where: { users: { id: user.id } },
        relations: ['permissions'],
      });

      for (const userGroup of userGroups) {
        if (userGroup.id !== groupId) {
          for (const update of permissionUpdates) {
            const permission = await this.permissionRepository.findOne({
              where: { id: update.id },
            });
            if (permission) {
              if (update.isActive) {
                if (
                  !userGroup.permissions.some((p) => p.id === permission.id)
                ) {
                  userGroup.permissions.push(permission);
                }
              } else {
                userGroup.permissions = userGroup.permissions.filter(
                  (p) => p.id !== permission.id,
                );
              }
            }
          }
          await this.groupRepository.save(userGroup);
        }
      }
    }

    // Refresh and return the updated group
    return this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions'],
    });
  }
  async updateGroupPermissionsAndSync(
    groupId: number,
    permissionIds: number[],
    userId: number,
  ): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['permissions', 'users'],
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Cập nhật quyền cho nhóm hiện tại
    group.permissions = await this.permissionRepository.findByIds(
      permissionIds,
    );
    await this.groupRepository.save(group);

    // Lấy tất cả các nhóm của người dùng
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['groups'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Đồng bộ hóa quyền với các nhóm khác của người dùng
    for (const userGroup of user.groups) {
      if (userGroup.id !== groupId) {
        userGroup.permissions = [...group.permissions];
        await this.groupRepository.save(userGroup);
      }
    }

    return group;
  }
}
