import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateUserDto } from './dtos/updateUserDto';
import { RegisterUserDto } from './dtos/registerUserDto';
import { AuthService } from 'src/users/auth/auth.service';
import { LoginUserDto } from './dtos/loginUserDto';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from './decorators/user.decorator';
import { User } from './entities/user.entity';
import { RoleGuard } from 'src/guards/role.guard';
import { RefreshTokenDto } from './dtos/refreshTokenDto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('users')
export class UserController {
  constructor(
    private userService: UsersService,
    private authService: AuthService,
  ) {}
  @Get()
  @UseInterceptors(ClassSerializerInterceptor) //* don't show password
  @UseGuards(AuthGuard, AdminGuard)
  async getAllUsers() {
    console.log('second interceptors');
    const users = await this.userService.findAll();
    return users.map((user) => ({
      ...user,
      role: user.role, // Explicitly include the role
    }));
  }
  @Get('current-user')
  @UseGuards(AuthGuard)
  findOne(@CurrentUser() currentUser: User) {
    return currentUser;
  }
  @Get(':userId')
  @UseGuards(AuthGuard)
  getUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.findByUserId(userId);
  }

  @Put(':userId')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(new RoleGuard(['admin', 'user', 'rootadmin']))
  @UseGuards(AuthGuard)
  updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() requestBody: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.updateByUserId(userId, requestBody, currentUser);
  }
  @Delete(':userId')
  @UseGuards(new RoleGuard(['admin', 'user', 'rootadmin']))
  @UseGuards(AuthGuard)
  deleteUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.deleteByUserId(userId, currentUser);
  }
  @Post('/register')
  registerUser(@Body() requestBody: RegisterUserDto) {
    return this.authService.registerUser(requestBody);
  }
  @Post('/login')
  loginUser(@Body() requestBody: LoginUserDto) {
    return this.authService.loginUser(requestBody);
  }
  @Post('/logout')
  @UseGuards(AuthGuard)
  logoutUser(@CurrentUser() currentUser: User) {
    return this.authService.logoutUser(currentUser.id);
  }
  @Post('/refresh-token')
  refreshToken(@Body() requestBody: RefreshTokenDto) {
    return this.authService.refreshTokens(requestBody.refreshToken);
  }
  @Post('upload-avatar/:userId')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @Param('userId') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(userId, file);
  }

  @Delete('delete-avatar/:userId')
  async deleteAvatar(@Param('userId') userId: number) {
    return this.userService.deleteAvatar(userId);
  }
  @Post(':userId/groups/:groupId')
  async addUserToGroup(
    @Param('userId') userId: number,
    @Param('groupId') groupId: number,
  ) {
    await this.userService.addUserToGroup(userId, groupId);
    return { message: 'User added to group successfully' };
  }

  @Get(':userId/permissions')
  async getUserPermissions(@Param('userId') userId: number) {
    return this.userService.getUserPermissions(userId);
  }

  @Put(':userId/permissions')
  async updateUserPermissions(
    @Param('userId') userId: number,
    @Body() permissions: { [key: string]: boolean },
  ) {
    await this.userService.updateUserPermissions(userId, permissions);
    return { message: 'User permissions updated successfully' };
  }
}
