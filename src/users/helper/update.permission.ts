import { BadRequestException } from '@nestjs/common';
import { User } from '../entities/user.entity';

export class updatePermission {
  static async check(id: number, currentUser: User) {
    if (id === currentUser.id) return;
    if (currentUser.role.toLowerCase() === 'admin') return;
    throw new BadRequestException(
      'User is not authorized to perform this action',
    );
  }
}
