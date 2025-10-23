import { JwtTokenPayload } from '@/auth/interfaces/jwt-token-payload.interface';
import { makeCookieExtractor } from '@/auth/utils/extractors';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const jwtOptions = ExtractJwt.fromExtractors([
      makeCookieExtractor('accessToken'),
    ]);
    super({
      jwtFromRequest: jwtOptions,
      secretOrKey: configService.getOrThrow('JWT_ACCESS_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      ignoreExpiration: false,
      jsonWebTokenOptions: { clockTolerance: 5 },
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtTokenPayload): { userId: string; deviceId: string } {
    return { userId: payload.sub, deviceId: payload.deviceId };
  }
}
