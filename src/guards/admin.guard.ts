import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.currentUser;
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (!user.role) {
      throw new UnauthorizedException('User role not defined');
    }

    if (
      user.role.toLowerCase() !== 'admin' &&
      user.role.toLowerCase() !== 'rootadmin'
    ) {
      throw new UnauthorizedException('User could not perform this action');
    }

    return true;
  }
}
