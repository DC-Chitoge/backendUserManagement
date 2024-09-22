import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from '../dtos/updateUserDto';
import { UpdatePermission } from './update.permission';

export class UserPermissionChecker {
  static check(
    action: 'update' | 'delete',
    currentUser: User,
    targetUser: User,
    targetUserId: number,
    requestBody?: UpdateUserDto,
  ) {
    const currentRole = currentUser.role.toLowerCase();
    const targetRole = targetUser.role.toLowerCase();

    if (action === 'update' && requestBody?.role) {
      this.checkRoleUpdatePermission(currentRole, requestBody.role);
    }

    switch (currentRole) {
      case 'rootadmin':
        return;
      case 'admin':
        this.checkAdminPermission(action, targetRole);
        break;
      case 'user':
        this.checkUserPermission(action, currentUser.id, targetUserId);
        break;
      default:
        throw new ForbiddenException(`Unauthorized to ${action} users`);
    }

    if (action === 'update') {
      UpdatePermission.check(targetUserId, currentUser);
    }
  }

  private static checkRoleUpdatePermission(
    currentRole: string,
    newRole: string,
  ) {
    if (currentRole !== 'rootadmin') {
      throw new ForbiddenException('Only ROOTADMIN can update role');
    }
    if (newRole.toLowerCase() === 'rootadmin') {
      throw new BadRequestException('ROOTADMIN role cannot be assigned');
    }
  }

  private static checkAdminPermission(action: string, targetRole: string) {
    if (['admin', 'rootadmin'].includes(targetRole)) {
      throw new ForbiddenException(
        `Admin cannot ${action} other admins or rootadmins`,
      );
    }
  }

  private static checkUserPermission(
    action: string,
    currentUserId: number,
    targetUserId: number,
  ) {
    if (currentUserId !== targetUserId) {
      throw new ForbiddenException(
        `Users can only ${action} their own account`,
      );
    }
  }
}
