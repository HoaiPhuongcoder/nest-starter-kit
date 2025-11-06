import { JwtTokenPayload } from '@/auth/interfaces/jwt-token-payload.interface';
import { RedisService } from '@/redis/redis.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccessBlacklistService {
  constructor(private readonly redisService: RedisService) {}

  private userRevokedKey(userId: string) {
    return `user:${userId}:at:revokedBefore`;
  }
  private deviceRevokedKey(userId: string, deviceId: string) {
    return `user:${userId}:device:${deviceId}:at:revokedBefore`;
  }
  private atBlacklistKey(atJti: string) {
    return `at:blacklist:${atJti}`;
  }

  async isRevoked(at: JwtTokenPayload) {
    const [perJti, userBefore, deviceBefore] = await this.redisService.mget([
      this.atBlacklistKey(at.jti),
      this.userRevokedKey(at.sub),
      this.deviceRevokedKey(at.sub, at.deviceId),
    ]);

    if (perJti !== null) return true;

    const iat = +at.iat || 0;
    const u = userBefore ? Number(userBefore) : 0;
    if (iat < u) return true;

    const d = deviceBefore ? Number(deviceBefore) : 0;
    if (iat < d) return true;

    return false;
  }

  async blacklistAtJti(atJti: string, secondsUntilExp: number) {
    if (secondsUntilExp <= 0) {
      secondsUntilExp = 1;
    }
    await this.redisService.set(
      this.atBlacklistKey(atJti),
      '1',
      secondsUntilExp,
    );
  }
  async bumpUserRevokedBefore(userId: string, at?: number) {
    const now = at ?? Math.floor(Date.now() / 1000);
    await this.redisService.set(this.userRevokedKey(userId), String(now));
  }

  async bumpDeviceRevokedBefore(userId: string, deviceId: string, at?: number) {
    const now = at ?? Math.floor(Date.now() / 1000);
    await this.redisService.set(
      this.deviceRevokedKey(userId, deviceId),
      String(now),
    );
  }
}
