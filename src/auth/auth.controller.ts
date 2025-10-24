import { AuthService } from '@/auth/auth.service';
import { LoginDto, LoginResponseDto } from '@/auth/dtos/login.dto';
import {
  RegisterUserDto,
  RegisterUserResponseDto,
} from '@/auth/dtos/register-user.dto';
import { CookieAuthService } from '@/auth/services/cookie-auth.service';
import { ResponseMessage } from '@/utils/decorator/response-message.decorator';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { type Response, type Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieAuthService: CookieAuthService,
  ) {}

  @ResponseMessage('User created successfully')
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const result = await this.authService.register(registerUserDto);
    return new RegisterUserResponseDto(result);
  }

  @ResponseMessage('Login successfully')
  @Post('login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.login(loginDto);
    this.cookieAuthService.setAuthCookies(res, accessToken, refreshToken);
    return new LoginResponseDto({ accessToken, refreshToken });
  }

  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Logout successfully')
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const deviceId = req.user?.deviceId;

    this.cookieAuthService.clearAuthCookies(res);
    return deviceId;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: Request) {
    return {
      userId: req.user,
    };
  }
}
