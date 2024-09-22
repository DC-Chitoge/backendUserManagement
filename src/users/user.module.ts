import { Module } from '@nestjs/common';
import { UsersService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuthService } from 'src/users/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { Group } from 'src/groups/entities/group.entity';
import { Permission } from 'src/permissions/entities/permission.entity';
import { GroupModule } from 'src/groups/group.module';
import { PermissionModule } from 'src/permissions/permission.module';
import { UserAdminController } from './userAdmin.Controller';
import { UserCacheService } from './userCache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Group, Permission]),
    JwtModule.register({
      global: true,
      signOptions: { expiresIn: '1d' },
    }),
    GroupModule,
    PermissionModule,
  ],
  controllers: [UserController, UserAdminController],
  providers: [UsersService, AuthService, UserCacheService],
  exports: [UsersService, AuthService, UserCacheService],
})
//* middleware
export class UserModule {}
