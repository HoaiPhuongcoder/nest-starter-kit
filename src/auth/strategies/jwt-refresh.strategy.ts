import { JwtTokenPayload } from '@/auth/interfaces/jwt-token-payload.interface';
import { SessionService } from '@/auth/services/session.service';
import { makeCookieExtractor } from '@/auth/utils/extractors';
import { Injectable } from '@nestjs/common';
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
    private readonly sessionService: SessionService,
  ) {
    const jwtOptions = ExtractJwt.fromExtractors([
      makeCookieExtractor('refreshToken'),
    ]);
    super({
      jwtFromRequest: jwtOptions,
      secretOrKey: configService.getOrThrow('JWT_REFRESH_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      ignoreExpiration: false,
      algorithms: ['HS256'],
    });
  }
  async validate(payload: JwtTokenPayload): Promise<{
    userId: string;
    deviceId: string;
    jti: string;
  }> {
    const { sub, jti, deviceId } = payload;
    const userId = sub;
    await this.sessionService.validateDeviceSession({ deviceId, jti, userId });
    return { userId, deviceId, jti };
  }
}
