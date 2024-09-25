import { forwardRef, Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Group } from 'src/modules/groups/entities/group.entity';
import { AuthService } from 'src/modules/users/auth/auth.service';
import { UserModule } from 'src/modules/users/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, User, Group]),
    forwardRef(() => UserModule),
  ],
  controllers: [PermissionController],
  providers: [PermissionService, AuthService],
  exports: [PermissionService],
})
export class PermissionModule {}
