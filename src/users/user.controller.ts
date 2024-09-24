import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseFilters,
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
import { HttpExceptionFilter } from 'src/exception-filters/http-exception.filter';
import { UserCacheService } from './userCache.service';
@Controller('users')
@UseFilters(HttpExceptionFilter)
// @ApiBearerAuth()
// @ApiTags('User route')
export class UserController {
  constructor(
    private userService: UsersService,
    private authService: AuthService,
    private userCacheService: UserCacheService,
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
    const cachedUser = this.userCacheService.getUser(currentUser.id);
    console.log('>>>check current user', cachedUser);
    return cachedUser || currentUser;
  }
  @Get(':userId')
  @UseGuards(AuthGuard, new RoleGuard(['admin', 'rootadmin']))
  getUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.findByUserId(userId);
  }

  @Put(':userId')
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(AuthGuard, new RoleGuard(['admin', 'user', 'rootadmin']))
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
  @HttpCode(200)
  @Post('/login')
  async loginUser(@Body() requestBody: LoginUserDto) {
    return this.authService.loginUser(requestBody);
  }
  @Post('/logout')
  @UseGuards(AuthGuard)
  logoutUser(@CurrentUser() currentUser: User) {
    return this.authService.logoutUser(currentUser.id);
  }
  @Post('/refresh-token')
  @UseGuards(AuthGuard)
  refreshToken(@Body() requestBody: RefreshTokenDto) {
    return this.authService.refreshTokens(requestBody.refreshToken);
  }
  @Post('upload-avatar/:userId')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(userId, currentUser, file);
  }
  @UseGuards(AuthGuard)
  @Delete('delete-avatar/:userId')
  async deleteAvatar(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.deleteAvatar(userId, currentUser);
  }
  @UseGuards(AuthGuard)
  @Get(':userId/permissions')
  async getUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: User,
  ) {
    try {
      const checkUser = await this.userCacheService.getUser(currentUser.id);
      if (
        checkUser.id !== userId &&
        checkUser.role.toLowerCase() !== 'rootadmin'
      ) {
        throw new ForbiddenException(
          `You do not have permission to view this user's permissions`,
        );
      }
      const permissions = await this.userService.getUserPermissions(userId);
      return { permissions };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
  @UseGuards(AuthGuard)
  @Get(':userId/groups')
  async getUserGroups(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: User,
  ) {
    try {
      const checkUser = await this.userCacheService.getUser(currentUser.id);
      if (
        checkUser.id !== userId &&
        checkUser.role.toLowerCase() !== 'rootadmin'
      ) {
        throw new ForbiddenException(
          `You do not have permission to view this user's groups`,
        );
      }
      const groups = await this.userService.getUserGroups(userId);
      return { groups };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
