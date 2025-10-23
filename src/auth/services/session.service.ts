import { SessionCreateParams } from '@/auth/interfaces/session.interface';
import { RedisService } from '@/redis/redis.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  private readonly REFRESH_TTL_SEC: number;
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const ttlMs = configService.get<number>('REFRESH_TOKEN_MAX_AGE_MS');
    if (!ttlMs || ttlMs <= 0) {
      throw new InternalServerErrorException('TTL MS is invalid');
    }
    this.REFRESH_TTL_SEC = Math.floor(ttlMs / 1000);
  }

  private getCurrentKey(deviceId: string) {
    const currentKey = `session:${deviceId}:current`;
    return currentKey;
  }

  private getJtiKey(deviceId: string, rtJti: string) {
    const jtiKey = `session:${deviceId}:jti:${rtJti}`;
    return jtiKey;
  }
  private getUserDevicesKey(userId: string) {
    const userDevicesKey = `user:${userId}:devices`;
    return userDevicesKey;
  }

  // Example: Better method organization with documentation
  /**
   * Creates a new user session with refresh token rotation support
   * @param rtJti - Refresh token JTI (JWT ID)
   * @param atJti - Access token JTI
   * @param userId - Unique user identifier
   * @param deviceId - Unique device identifier
   * @throws {InternalServerErrorException} When Redis operation fails
   */

  async createSession(params: SessionCreateParams) {
    const { rtJti, atJti, deviceId, userId } = params;
    if (!rtJti || !atJti || !userId || !deviceId) {
      throw new InternalServerErrorException(
        'All session parameters are required',
      );
    }
    try {
      const currentKey = this.getCurrentKey(deviceId);
      const jtiKey = this.getJtiKey(deviceId, rtJti);
      const userDevicesKey = this.getUserDevicesKey(userId);
      const pipe = this.redisService.pipeline();
      pipe.set(currentKey, rtJti);
      pipe.expire(currentKey, this.REFRESH_TTL_SEC);
      pipe.hset(jtiKey, {
        userId,
        deviceId,
        rotated: false,
        atJti,
        createdAt: Date.now(),
      });
      pipe.expire(jtiKey, this.REFRESH_TTL_SEC);

      pipe.sadd(userDevicesKey, deviceId);
      await pipe.exec();
    } catch (err) {
      throw new InternalServerErrorException(
        'Fail to create session in Redis',
        { cause: err },
      );
    }
  }
}
