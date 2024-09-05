import { BadRequestException } from '@nestjs/common';
import { User } from '../entities/user.entity';

export class updatePermission {
  static check(id: number, currentUser: User) {
    console.log(typeof currentUser.id, typeof id);
    if (id === currentUser.id) return;
    if (currentUser.role.toLowerCase() === 'admin') return;
    else {
      throw new BadRequestException(
        'User is not authorized to perform this action',
      );
    }
  }
}
