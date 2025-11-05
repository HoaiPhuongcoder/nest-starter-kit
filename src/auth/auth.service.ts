import { LoginDto } from '@/auth/dtos/login.dto';
import { RegisterUserDto } from '@/auth/dtos/register-user.dto';
import { SessionService } from '@/auth/services/session.service';
import { HashingService } from '@/shared/services/hashing.service';
import { JwtTokenService } from '@/auth/services/jwt-token.service';
import { UsersService } from '@/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CookieAuthService } from '@/auth/services/cookie-auth.service';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashingService: HashingService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly sessionService: SessionService,
    private readonly cookieAuthService: CookieAuthService,
  ) {}

  /**
   * Registers a new user in the system
   * @param registerUserDto - User registration data
   * @returns Promise<User> - Created user object (without password)
   */
  async register(
    registerUserDto: RegisterUserDto,
  ): Promise<Omit<User, 'password'>> {
    const { name, email, password } = registerUserDto;

    const passwordHash = await this.hashingService.hash(password);

    const user = await this.usersService.createUser({
      email,
      name,
      passwordHash,
    });
    return user;
  }

  /**
   * Authenticates a user with email and password
   * @param loginDto - User login credentials
   * @returns Promise<TokenPair> - Access and refresh tokens
   * @throws UnauthorizedException - When credentials are invalid
   */

  async login(
    params: LoginDto & { res: Response },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password, deviceId, res } = params;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Wrong email or password');
    }
    const isPasswordMatch = await this.hashingService.compare(
      password,
      user.password,
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Wrong email or password');
    }
    const rtJti = randomUUID();
    const atJti = randomUUID();

    await this.sessionService.createSession({
      rtJti,
      atJti,
      userId: user.id,
      deviceId,
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtTokenService.signAccessToken({
        sub: user.id,
        deviceId,
        jti: atJti,
      }),
      this.jwtTokenService.signRefreshToken({
        sub: user.id,
        deviceId,
        jti: rtJti,
      }),
    ]);

    this.cookieAuthService.setAuthCookies(res, accessToken, refreshToken);
    return { accessToken, refreshToken };
  }

  async logoutDevice({
    deviceId,
    res,
    userId,
  }: {
    deviceId: string;
    userId: string;
    res: Response;
  }) {
    await this.sessionService.logoutDevice(deviceId, userId);
    this.cookieAuthService.clearAuthCookies(res);
  }

  async logoutAllDevices({
    res,
    userId,
  }: {
    userId: string;
    res: Response;
  }): Promise<void> {
    await this.sessionService.logoutAllDevices(userId);
    this.cookieAuthService.clearAuthCookies(res);
  }
}
