import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    //* 1) get token from header
    try {
      const token = request.headers.authorization.split(' ')[1];
      if (!token) {
        throw new ForbiddenException('token must be provided');
      }
      //* 2 jwtVerify invalid token

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      // console.log('>>>payload', payload);
      //* 3 find user in db based jwtVerify
      const user = await this.userService.findByUserId(payload.id);
      if (!user) {
        throw new ForbiddenException('user has not token');
      }
      request.currentUser = user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}
