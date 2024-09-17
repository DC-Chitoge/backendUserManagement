import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupPermission } from './entities/group-permission.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class GroupPermissionService {
  constructor(
    @InjectRepository(GroupPermission)
    private readonly groupPermissionRepository: Repository<GroupPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async updateGroupPermission(
    groupId: number,
    permissionId: number,
    isActive: boolean,
  ): Promise<void> {
    let groupPermission = await this.groupPermissionRepository.findOne({
      where: { group: { id: groupId }, permission: { id: permissionId } },
    });

    if (!groupPermission) {
      groupPermission = this.groupPermissionRepository.create({
        group: { id: groupId },
        permission: { id: permissionId },
      });
    }

    groupPermission.isActive = isActive;
    await this.groupPermissionRepository.save(groupPermission);

    if (isActive) {
      await this.activatePermissionForRelatedUsers(groupId, permissionId);
    }
  }

  private async activatePermissionForRelatedUsers(
    groupId: number,
    permissionId: number,
  ): Promise<void> {
    const users = await this.userRepository.find({
      relations: ['groups'],
      where: { groups: { id: groupId } },
    });

    for (const user of users) {
      for (const group of user.groups) {
        if (group.id !== groupId) {
          await this.updateGroupPermission(group.id, permissionId, true);
        }
      }
    }
  }
}
