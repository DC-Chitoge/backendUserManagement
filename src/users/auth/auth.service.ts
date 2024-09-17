import {
  BadRequestException,
  Body,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from 'src/users/dtos/registerUserDto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user.service';
import { LoginUserDto } from '../dtos/loginUserDto';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registerUser(@Body() requestBody: RegisterUserDto) {
    const userByEmail = await this.userService.findByEmail(requestBody.email);
    if (userByEmail) {
      throw new BadRequestException(`email is already exist`);
    }
    //* hass password

    const hashPassword = await bcrypt.hash(requestBody.password, 10);
    requestBody.password = hashPassword;
    //* save to db
    const savedUser = await this.userService.createUser(requestBody);

    const { accessToken, refreshToken } = await this.generateTokens(
      savedUser.id,
    );
    // Add this line

    // Update the user in the database with the new refresh token
    await this.usersRepository.update(savedUser.id, {
      refreshToken: refreshToken,
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    return {
      message: 'user has been created !',
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }
  async loginUser(@Body() requestBody: LoginUserDto) {
    const userEmail = await this.userService.findByEmail(requestBody.email);
    if (!userEmail) {
      throw new BadRequestException('Invalid credential ');
    }
    //* compare pass
    const isMatchPass = await bcrypt.compare(
      requestBody.password,
      userEmail.password,
    );
    if (!isMatchPass) {
      throw new BadRequestException('Invalid credential ');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      userEmail.id,
    );
    await this.usersRepository.update(userEmail.id, {
      refreshToken: refreshToken,
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    return {
      msg: 'login succesfully !',
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }
  async logoutUser(userId: number) {
    try {
      // Xóa refreshToken khỏi cơ sở dữ liệu
      await this.removeRefreshToken(userId);

      // Xóa refreshToken khỏi cookies nếu cần
      // (Front-end cần gửi yêu cầu xóa cookie này)

      return {
        message: 'Logout successfully',
      };
    } catch (error) {
      throw new BadRequestException('Logout failed');
    }
  }
  async generateTokens(userId: number) {
    const payload = {
      id: userId,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15p',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }
  async refreshTokens(refreshToken: string) {
    try {
      // Xác minh refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Tạo các token mới
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(payload.id);

      // Cập nhật refreshToken và thời gian hết hạn trong cơ sở dữ liệu nếu cần

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  async updateRefreshToken(
    userId: number,
    refreshToken: string,
    expiresAt: Date,
  ) {
    await this.usersRepository.update(userId, {
      refreshToken,
      refreshTokenExpires: expiresAt,
    });
  }

  async removeRefreshToken(userId: number) {
    await this.usersRepository.update(userId, {
      refreshToken: null,
      refreshTokenExpires: null,
    });
  }
}
