import { Module, forwardRef } from '@nestjs/common';
import { Group } from './entities/group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { User } from 'src/modules/users/entities/user.entity';
import { Permission } from 'src/modules/permissions/entities/permission.entity';
import { UserModule } from 'src/modules/users/user.module';
import { AuthService } from 'src/modules/users/auth/auth.service';
import { UserCacheService } from 'src/modules/users/userCache.service';

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
