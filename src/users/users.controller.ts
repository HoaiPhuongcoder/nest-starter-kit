import { CreateUser } from '@/users/dto/create-user.dto';
import { UsersService } from './users.service';
import { Body, Controller, Post } from '@nestjs/common';
import { LoginBody } from '@/users/dto/login.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}
  @Post('register')
  async register(@Body() registerBody: CreateUser) {
    const data = await this.usersService.createUser(registerBody);
    return {
      message: 'Tạo Mới Thành Công User',
      data,
    };
  }
  @Post('login')
  async Login(@Body() loginBody: LoginBody) {
    const data = await this.usersService.login(loginBody);
    return {
      message: 'Login Đăng Nhập Thành Công',
      data,
    };
  }
}
