import { Module } from '@nestjs/common';
import { Group } from './entities/group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { User } from 'src/users/entities/user.entity';
import { Permission } from 'src/permissions/entities/permission.entity';
import { GroupPermission } from './entities/group-permission.entity';
import { GroupPermissionService } from './group-permission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, User, Permission, GroupPermission]),
  ],
  controllers: [GroupController],
  providers: [GroupService, GroupPermissionService],
  exports: [GroupService, GroupPermissionService],
})
export class GroupModule {}
