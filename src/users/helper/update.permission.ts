import { BadRequestException } from '@nestjs/common';
import { User } from '../entities/user.entity';

export class UpdatePermission {
  static async check(id: number, currentUser: User) {
    if (id === currentUser.id) return;
    if (currentUser.role.toLowerCase() === 'rootadmin') return;
    // if (currentUser.role.toLowerCase() === 'admin') return;
    throw new BadRequestException(
      'You have not authorized to perform this action',
    );
  }
}
