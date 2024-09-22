import { BadRequestException } from '@nestjs/common';
import { User } from '../entities/user.entity';

export class AdminPermission {
  static check(currentUser: User) {
    if (currentUser.role.toLowerCase() === 'rootadmin') return;
    if (currentUser.role.toLowerCase() === 'admin') return;
    else {
      throw new BadRequestException(
        'User is not authorized to perform this action',
      );
    }
  }
}
