import { forwardRef, Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { User } from 'src/users/entities/user.entity';
import { Group } from 'src/groups/entities/group.entity';
import { AuthService } from 'src/users/auth/auth.service';
import { UserModule } from 'src/users/user.module';
import { UserCacheService } from 'src/users/userCache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, User, Group]),
    forwardRef(() => UserModule),
  ],
  controllers: [PermissionController],
  providers: [PermissionService, AuthService, UserCacheService],
  exports: [PermissionService],
})
export class PermissionModule {}
