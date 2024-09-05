import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dtos/updateUserDto';
import { RegisterUserDto } from './dtos/registerUserDto';
import { adminPermission } from './helper/admin.permission';
import { updatePermission } from './helper/update.permission';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  createUser(requestBody: RegisterUserDto) {
    const user = this.usersRepository.create(requestBody);
    return this.usersRepository.save(user);
  }
  findAll() {
    return this.usersRepository.find();
  }
  findById(id: number) {
    return this.usersRepository.findOneBy({ id });
  }
  findByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }
  async updateById(id: number, requestBody: UpdateUserDto, currentUser: User) {
    let user = await this.findById(id);
    if (requestBody.role) {
      throw new BadRequestException('role could not be updated');
    }
    updatePermission.check(id, currentUser);
    user = { ...user, ...requestBody };
    return this.usersRepository.save(user);
  }
  deleteById(id: number, currentUser: User) {
    adminPermission.check(currentUser);
    return this.usersRepository.delete({ id });
  }
  //* avatar
  async updateAvatar(id: number, file: Express.Multer.File): Promise<User> {
    try {
      const user = await this.usersRepository.findOneBy({ id });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Delete old avatar if exists
      if (user.avatarUrl) {
        const oldAvatarPath = path.join(uploadsDir, user.avatarUrl);
        await fs.unlink(oldAvatarPath).catch(() => {});
      }

      // Save new avatar
      const avatarUrl = `${Date.now()}-${file.originalname}`;
      const newAvatarPath = path.join(uploadsDir, avatarUrl);
      await fs.writeFile(newAvatarPath, file.buffer);

      // Update user in database
      user.avatarUrl = avatarUrl;
      await this.usersRepository.save(user);
      return user;
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw new BadRequestException(
        `Failed to update avatar: ${error.message}`,
      );
    }
  }

  async deleteAvatar(id: number): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.avatarUrl) {
        await fs.unlink(`uploads/${user.avatarUrl}`);
        user.avatarUrl = null;
        return this.usersRepository.save(user);
      }

      return user;
    } catch (error) {
      throw new BadRequestException('Failed to delete avatar');
    }
  }
}
