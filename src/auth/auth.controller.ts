import { AuthService } from '@/auth/auth.service';
import { RegisterUserDto } from '@/auth/dtos/register-user.dto';
import { Body, Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return await this.authService.register(registerUserDto);
  }
  @Post('login')
  login() {}
}
