import { Module, forwardRef } from '@nestjs/common';
import { Group } from './entities/group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { User } from 'src/users/entities/user.entity';
import { Permission } from 'src/permissions/entities/permission.entity';
import { UserModule } from 'src/users/user.module';
import { AuthService } from 'src/users/auth/auth.service';
import { UserCacheService } from 'src/users/userCache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, User, Permission]),
    forwardRef(() => UserModule),
  ],
  controllers: [GroupController],
  providers: [GroupService, AuthService, UserCacheService],
  exports: [GroupService],
})
export class GroupModule {}
