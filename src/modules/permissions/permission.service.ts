import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { UpdatePermissionDto } from './dtos/updatePermission';
import { CreatePermissionDto } from './dtos/createPermissionDto';
import { Group } from 'src/modules/groups/entities/group.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  async create(permission: CreatePermissionDto): Promise<Permission> {
    try {
      const isCheckNamePermission = await this.permissionRepository.findOneBy({
        name: permission.name,
      });
      if (isCheckNamePermission) {
        throw new BadRequestException('Permission already exists');
      }
      return await this.permissionRepository.save(permission);
    } catch (error) {
      throw new BadRequestException('Error :' + error.response.message);
    }
  }
  async findAll(): Promise<Permission[]> {
    try {
      return await this.permissionRepository.find();
    } catch (error) {
      throw new BadRequestException('Error :' + error.response.message);
    }
  }

  async findOne(id: number): Promise<Permission> {
    try {
      const existingPermission = await this.permissionRepository.findOneBy({
        id,
      });
      if (!existingPermission) {
        throw new BadRequestException('Permission does not exist');
      }
      return await this.permissionRepository.findOneBy({ id });
    } catch (error) {
      throw new BadRequestException('Error :' + error.response.message);
    }
  }
  async findByName(permissionName: string) {
    if (!permissionName || permissionName.trim() === '')
      throw new BadRequestException(
        'PermissionName parameter must be a non-empty string',
      );
    try {
      const permissions = await this.permissionRepository.find({
        where: { name: Like(`%${permissionName}%`) },
      });

      if (permissions.length === 0) {
        throw new NotFoundException(
          `No groups found with name containing "${permissionName}"`,
        );
      }
      return permissions;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async update(id: number, permission: UpdatePermissionDto) {
    try {
      const existingPermission = await this.permissionRepository.findOneBy({
        id: id,
      });
      if (!existingPermission) {
        throw new BadRequestException('Permission does not exist');
      }
      await this.permissionRepository.update({ id: id }, permission);
      const permissionUpdated = await this.permissionRepository.findOneBy({
        id: id,
      });
      return { permissionUpdated, message: 'updated succedfully!' };
    } catch (error) {
      throw new BadRequestException('Error :' + error.response.message);
    }
  }
  async remove(id: number) {
    try {
      // Tìm quyền cần xóa
      const permissionToDelete = await this.permissionRepository.findOne({
        where: { id: id },
        relations: ['users', 'groups'],
      });
      if (!permissionToDelete) {
        throw new Error('Permission not found');
      }
      const userIds = permissionToDelete.users.map((user) => user.id);
      const groupIds = permissionToDelete.groups.map((group) => group.id);
      if (userIds.length > 0)
        await this.userRepository
          .createQueryBuilder()
          .relation(User, 'permissions')
          .of(userIds)
          .remove(permissionToDelete.id);
      if (groupIds.length > 0)
        await this.groupRepository
          .createQueryBuilder()
          .relation(Group, 'permissions')
          .of(groupIds)
          .remove(permissionToDelete.id);
      await this.permissionRepository.remove(permissionToDelete);
      return { message: 'Permission deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Error: ' + error.response.message);
    }
  }
}
