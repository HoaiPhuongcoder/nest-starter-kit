import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/users/users.module';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtRefreshStrategy } from '@/auth/strategies/jwt-refresh.strategy';
import { SessionService } from './services/session.service';
import { CookieAuthService } from './services/cookie-auth.service';

@Module({
  imports: [UsersModule, PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    SessionService,
    CookieAuthService,
  ],
})
export class AuthModule {}
