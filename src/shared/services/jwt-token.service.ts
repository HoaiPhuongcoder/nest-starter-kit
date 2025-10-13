import { TokenPayload } from '@/shared/types/jwt.type';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async signAccessToken(userId: string) {
    return this.jwtService.signAsync(
      {},
      {
        subject: userId,
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES'),
        algorithm: 'HS256',
        jwtid: crypto.randomUUID(),
      },
    );
  }

  async signRefreshToken(userId: string) {
    return this.jwtService.signAsync(
      {},
      {
        subject: userId,
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES'),
        algorithm: 'HS256',
        jwtid: crypto.randomUUID(),
      },
    );
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }
}
