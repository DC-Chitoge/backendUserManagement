import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { UpdatePermissionDto } from './dtos/updatePermission';
import { CreatePermissionDto } from './dtos/createPermissionDto';
import { Group } from 'src/groups/entities/group.entity';
import { User } from 'src/users/entities/user.entity';

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
      const isExist = await this.permissionRepository.findOneBy({ id });
      if (!isExist) {
        throw new BadRequestException('Permission does not exist');
      }
      return await this.permissionRepository.findOneBy({ id });
    } catch (error) {
      throw new BadRequestException('Error :' + error.response.message);
    }
  }
  async update(id: number, permission: UpdatePermissionDto) {
    try {
      const isExist = await this.permissionRepository.findOneBy({
        id: id,
      });
      if (!isExist) {
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
        relations: ['users', 'group'],
      });
      if (!permissionToDelete) {
        throw new Error('Permission not found');
      }

      // Cập nhật người dùng đã từng sở hữu quyền này
      const users = permissionToDelete.users;
      for (const user of users) {
        // Kiểm tra xem user.permissions có tồn tại và là mảng
        if (Array.isArray(user.permissions)) {
          user.permissions = user.permissions.filter((perm) => perm.id !== id);
          await this.userRepository.save(user);
        }
      }
      // const groupId = permissionToDelete.group.id;
      // // Cập nhật các nhóm đã từng sở hữu quyền này
      // const groups = await this.groupRepository.find({
      //   where: { id: groupId },
      //   relations: ['permissions', 'users'],
      // });
      const groups = permissionToDelete.group;

      for (const group of groups) {
        // Kiểm tra xem group.permissions có tồn tại và là mảng
        if (Array.isArray(group.permissions)) {
          // Chỉ xóa quyền có ID tương ứng với quyền cần xóa
          group.permissions = group.permissions.filter(
            (perm) => perm.id !== id,
          );
          await this.groupRepository.save(group);
        }
      }

      // Cuối cùng, xóa quyền
      await this.permissionRepository.remove(permissionToDelete);
      return { message: 'Permission deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Error: ' + error.response.message);
    }
  }
}
