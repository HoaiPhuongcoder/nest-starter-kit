import { AuthService } from '@/auth/auth.service';
import { LoginDto, LoginResponseDto } from '@/auth/dtos/login.dto';
import { RefreshResponseDto } from '@/auth/dtos/refresh.dto';
import {
  RegisterUserDto,
  RegisterUserResponseDto,
} from '@/auth/dtos/register-user.dto';
import { CookieAuthService } from '@/auth/services/cookie-auth.service';
import { ResponseMessage } from '@/utils/decorator/response-message.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
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
    const { accessToken, refreshToken } = await this.authService.login({
      ...loginDto,
      res,
    });
    return new LoginResponseDto({ accessToken, refreshToken });
  }

  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Logout successfully')
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const deviceId = req.user?.deviceId;
    const userId = req.user?.userId;
    if (!deviceId || !userId) {
      throw new BadRequestException('Wrong Logout');
    }
    await this.authService.logoutDevice({ deviceId, res, userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Logout successfully')
  @Post('logout-all')
  async logoutAll(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Wrong Logout');
    }
    await this.authService.logoutAllDevices({ res, userId });
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 60000,
    },
  })
  @UseGuards(AuthGuard('jwt-refresh'))
  @ResponseMessage('refresh successfully')
  @Post('refresh')
  async refreshTokens(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const deviceId = req.user?.deviceId;
    const userId = req.user?.userId;
    const oldRtJti = req.user?.jti;

    if (!deviceId || !userId || !oldRtJti) {
      throw new BadRequestException('Wrong refresh');
    }
    const { accessToken, refreshToken } =
      await this.authService.rotateRefreshToken({
        res,
        deviceId,
        userId,
        oldRtJti,
      });

    return new RefreshResponseDto({ accessToken, refreshToken });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: Request) {
    return {
      userId: req.user,
    };
  }
}
