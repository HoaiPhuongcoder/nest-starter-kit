import { JwtTokenPayload } from '@/auth/interfaces/jwt-token-payload.interface';
import { RedisService } from '@/redis/redis.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('JWT_REFRESH_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }
  async validate(payload: JwtTokenPayload): Promise<{
    userId: string;
    deviceId: string;
    jti: string;
  }> {
    const { sub: userId, jti, deviceId } = payload;
    const currentKey = `session:${deviceId}:current`;
    const currentJti = await this.redisService.get(currentKey);
    if (!currentJti) {
      throw new UnauthorizedException('Session Not Found');
    }
    if (currentJti !== jti) {
      throw new UnauthorizedException(
        'Refresh token is not current (possible reuse)',
      );
    }
    const jitKey = `session:${deviceId}:jti:${jti}`;
    const meta = await this.redisService.hGetAll(jitKey);
    if (!meta || Object.keys(meta).length == 0) {
      throw new UnauthorizedException('Refresh token metadata missing');
    }

    if (meta['rotated'] === 'true') {
      throw new UnauthorizedException('Refresh token already rotated');
    }
    return { userId, deviceId, jti };
  }
}
