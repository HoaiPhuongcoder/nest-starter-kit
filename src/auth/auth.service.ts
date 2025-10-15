import { LoginDto } from '@/auth/dtos/login.dto';
import { RegisterUserDto } from '@/auth/dtos/register-user.dto';
import { HashingService } from '@/shared/services/hashing.service';
import { JwtTokenService } from '@/shared/services/jwt-token.service';
import { UsersService } from '@/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashingService: HashingService,
    private readonly jwtTokenService: JwtTokenService,
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

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtTokenService.signAccessToken(user.id),
      this.jwtTokenService.signRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken };
  }
}
