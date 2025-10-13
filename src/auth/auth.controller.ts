import { AuthService } from '@/auth/auth.service';
import { LoginDto, LoginResponseDto } from '@/auth/dtos/login.dto';
import {
  RegisterUserDto,
  RegisterUserResponseDto,
} from '@/auth/dtos/register-user.dto';
import { ResponseMessage } from '@/utils/decorator/response-message.decorator';
import { Body, Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ResponseMessage('User created successfully')
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const result = await this.authService.register(registerUserDto);
    return new RegisterUserResponseDto(result);
  }

  @ResponseMessage('Login successfully')
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { accessToken, refreshToken } =
      await this.authService.login(loginDto);
    return new LoginResponseDto({ accessToken, refreshToken });
  }
}
