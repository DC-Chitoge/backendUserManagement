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
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/user.decorator';
import { User } from './entities/user.entity';
import { RoleGuard } from './guards/role.guards';
import { RefreshTokenDto } from './dtos/refreshTokenDto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UserController {
  constructor(
    private userService: UsersService,
    private authService: AuthService,
  ) {}
  @Get()
  @UseInterceptors(ClassSerializerInterceptor) //* don't show password
  @UseGuards(new RoleGuard(['admin', 'mod']))
  @UseGuards(AuthGuard)
  getAllUsers() {
    console.log('second interceptors');
    return this.userService.findAll();
  }
  @Get('current-user')
  @UseGuards(AuthGuard)
  findOne(@CurrentUser() currentUser: User) {
    return currentUser;
  }
  @Get(':id')
  @UseGuards(AuthGuard)
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @UseGuards(new RoleGuard(['mod', 'admin', 'user']))
  @UseGuards(AuthGuard)
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() requestBody: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.updateById(id, requestBody, currentUser);
  }
  @Delete(':id')
  @UseGuards(new RoleGuard(['mod', 'admin', 'user']))
  @UseGuards(AuthGuard)
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.deleteById(id, currentUser);
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
  @Post('upload-avatar/:id')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.updateAvatar(id, file);
  }

  @Delete('delete-avatar/:id')
  async deleteAvatar(@Param('id') id: number) {
    return this.userService.deleteAvatar(id);
  }
}
