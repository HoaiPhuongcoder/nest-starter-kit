import { LoginDto } from '@/auth/dtos/login.dto';
import { RegisterUserDto } from '@/auth/dtos/register-user.dto';

import { RedisService } from '@/redis/redis.service';
import { HashingService } from '@/shared/services/hashing.service';
import { JwtTokenService } from '@/shared/services/jwt-token.service';
import { UsersService } from '@/users/users.service';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashingService: HashingService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
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
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password } = loginDto;
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
    const deviceId = randomUUID();
    const jti = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtTokenService.signAccessToken({ sub: user.id, deviceId }),
      this.jwtTokenService.signRefreshToken({ sub: user.id, deviceId, jti }),
    ]);
    const currentKey = `session:${deviceId}:current`;
    const jtiKey = `session:${deviceId}`;
    const ttlSec = this.configService.get<number | string>(
      'REFRESH_TOKEN_MAX_AGE_MS',
    );
    if (!ttlSec) {
      throw new InternalServerErrorException('TTL sec is invalid');
    }
    const pipe = this.redisService.pipeline();
    pipe.set(currentKey, jti);
    pipe.expire(currentKey, ttlSec);
    pipe.hset(jtiKey, {
      userId: user.id,
      deviceId,
      rotated: false,
      createdAt: Date.now(),
    });
    pipe.expire(jtiKey, ttlSec);

    await pipe.exec();

    await this.redisService
      .getClient()
      .sadd(`user:${user.id}:devices`, deviceId);

    return { accessToken, refreshToken };
  }
}
