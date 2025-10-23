import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';

type SameSite = 'lax' | 'strict' | 'none';

@Injectable()
export class CookieAuthService {
  private readonly accessMaxAge: number;
  private readonly refreshMaxAge: number;
  private readonly secure: boolean;
  private readonly sameSite: SameSite;
  private readonly domain?: string;
  private readonly path: string;

  constructor(private readonly configService: ConfigService) {
    this.accessMaxAge = +this.configService.get(
      'ACCESS_TOKEN_MAX_AGE_MS',
      15 * 60 * 1000,
    );
    this.refreshMaxAge = +this.configService.get(
      'REFRESH_TOKEN_MAX_AGE_MS',
      30 * 24 * 60 * 60 * 1000,
    );
    this.secure = this.configService.get<boolean>('COOKIE_SECURE', false);
    this.sameSite = this.configService.get<SameSite>('COOKIE_SAMESITE', 'lax');
    this.domain = this.configService.get('COOKIE_DOMAIN');
    this.path = '/';
  }

  private getCookieOptions(maxAge?: number) {
    const secureFlag = this.sameSite === 'none' ? true : this.secure;
    return {
      httpOnly: true,
      domain: this.domain,
      maxAge,
      sameSite: this.sameSite,
      path: this.path,
      secure: secureFlag,
    };
  }

  /**
   * Sets authentication cookies in the HTTP response
   * @param res Express response object
   * @param accessToken JWT access token
   * @param refreshToken JWT refresh token
   * @throws {Error} If tokens are invalid
   */

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    if (!accessToken || !refreshToken) {
      throw new Error('Both access and refresh tokens are required');
    }
    const accessTokenCookieOptions = this.getCookieOptions(this.accessMaxAge);
    const refreshTokenCookieOptions = this.getCookieOptions(this.refreshMaxAge);
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
  }

  /**
   * Clear authentication cookies in the HTTP response
   * @param res Express response object
   */
  clearAuthCookies(res: Response) {
    const accessTokenCookieOptions = this.getCookieOptions();
    const refreshTokenCookieOptions = this.getCookieOptions();
    res.clearCookie('accessToken', accessTokenCookieOptions);

    res.clearCookie('refreshToken', refreshTokenCookieOptions);
  }
}
