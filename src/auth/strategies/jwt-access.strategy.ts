import { JwtTokenPayload } from '@/auth/interfaces/jwt-token-payload.interface';
import { AccessBlacklistService } from '@/auth/services/access-blacklist.service';
import { makeCookieExtractor } from '@/auth/utils/extractors';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accessBlacklistService: AccessBlacklistService,
  ) {
    const jwtOptions = ExtractJwt.fromExtractors([
      makeCookieExtractor('accessToken'),
      ExtractJwt.fromAuthHeaderAsBearerToken(),
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

  async validate(payload: JwtTokenPayload) {
    const isRevoked = await this.accessBlacklistService.isRevoked(payload);
    if (isRevoked) {
      throw new UnauthorizedException('Access token revoked');
    }
    return {
      userId: payload.sub,
      deviceId: payload.deviceId,
      jti: payload.jti,
    };
  }
}
