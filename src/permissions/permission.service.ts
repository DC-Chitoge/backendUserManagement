import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { UpdatePermissionDto } from './dtos/updatePermission';
import { CreatePermissionDto } from './dtos/createPermissionDto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}
  async create(permission: CreatePermissionDto): Promise<Permission> {
    if (permission.isActive !== undefined) {
      permission.isActive = Boolean(permission.isActive);
    }
    return this.permissionRepository.save(permission);
  }
  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async findOne(id: number): Promise<Permission> {
    return this.permissionRepository.findOneBy({ id });
  }
  async update(permissionId: number, permission: UpdatePermissionDto) {
    await this.permissionRepository.update({ id: permissionId }, permission);
    const permissionUpdated = await this.permissionRepository.findOneBy({
      id: permissionId,
    });
    return { permissionUpdated, message: 'updated succedfully!' };
  }
  async remove(id: number) {
    await this.permissionRepository.delete(id);
    return { message: 'Permission deleted successfully' };
  }
}
