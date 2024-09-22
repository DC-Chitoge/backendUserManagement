import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';

@Injectable()
export class UserCacheService {
  private userCache: Map<number, User> = new Map();

  setUser(userId: number, user: User) {
    this.userCache.set(userId, user);
  }

  getUser(userId: number): User | undefined {
    return this.userCache.get(userId);
  }

  clearUser(userId: number) {
    this.userCache.delete(userId);
  }
}
