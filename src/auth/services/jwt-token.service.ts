import { JwtTokenPayload } from '@/auth/interfaces/jwt-token-payload.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async signAccessToken(
    payload: { sub: string; deviceId: string; jti: string },
    options?: Pick<JwtSignOptions, 'expiresIn' | 'jwtid'>,
  ) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES'),
      algorithm: 'HS256',
      issuer: this.configService.get<string>('JWT_ISSUER'),
      audience: this.configService.get<string>('JWT_AUDIENCE'),
      ...options,
    });
  }

  async signRefreshToken(
    payload: { sub: string; deviceId: string; jti: string },
    options?: Pick<JwtSignOptions, 'expiresIn' | 'jwtid'>,
  ) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES'),
      algorithm: 'HS256',
      issuer: this.configService.get<string>('JWT_ISSUER'),
      audience: this.configService.get<string>('JWT_AUDIENCE'),
      ...options,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      issuer: this.configService.get('JWT_ISSUER'),
      audience: this.configService.get('JWT_AUDIENCE'),
    });
  }

  async verifyRefreshToken(token: string): Promise<JwtTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      issuer: this.configService.get('JWT_ISSUER'),
      audience: this.configService.get('JWT_AUDIENCE'),
    });
  }
}
