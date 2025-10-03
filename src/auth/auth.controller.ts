import { AuthService } from '@/auth/auth.service';
import { Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  register() {}
  @Post('login')
  login() {}
}
