import { AuthService } from '@/auth/auth.service';
import {
  RegisterUserDto,
  RegisterUserResponseDto,
} from '@/auth/dtos/register-user.dto';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const result = await this.authService.register(registerUserDto);
    return new RegisterUserResponseDto(result);
  }
  @Post('login')
  login() {}
}
