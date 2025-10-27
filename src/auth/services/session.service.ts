import { SessionCreateParams } from '@/auth/interfaces/session.interface';
import { RedisService } from '@/redis/redis.service';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SessionData {
  userId: string;
  deviceId: string;
  rotated: boolean;
  atJti: string;
  createAt: number;
}

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

  async isDeviceExist(userId: string, deviceId: string) {
    const userDevicesKey = this.getUserDevicesKey(userId);
    return await this.redisService.sIsMember(userDevicesKey, deviceId);
  }

  async getCurrentJti(deviceId: string) {
    const currentKey = this.getCurrentKey(deviceId);
    return await this.redisService.get(currentKey);
  }

  async setCurrentJti(deviceId: string, jti: string, ttlSec: number) {
    const currentKey = this.getCurrentKey(deviceId);
    return await this.redisService.set(currentKey, jti, ttlSec);
  }

  async getMeta(deviceId: string, jti: string) {
    const jtiKey = this.getJtiKey(deviceId, jti);
    return await this.redisService.hGetAll(jtiKey);
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
      const sessionData: Omit<SessionData, 'userId' | 'deviceID'> = {
        rotated: false,
        atJti,
        createAt: Date.now(),
      };
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

  async validateDeviceSession(params: {
    userId: string;
    deviceId: string;
    jti: string;
  }): Promise<void> {
    const { deviceId, jti, userId } = params;
    const isExistDevice = await this.isDeviceExist(userId, deviceId);
    if (!isExistDevice) {
      throw new UnauthorizedException('Device not linked to user');
    }

    const currentJti = await this.getCurrentJti(deviceId);
    if (!currentJti) {
      throw new UnauthorizedException('Session not found');
    }
    if (currentJti !== jti) {
      throw new UnauthorizedException(
        'Refresh token is not current (possible reuse)',
      );
    }

    const meta = await this.getMeta(deviceId, jti);
    if (!meta || Object.keys(meta).length === 0) {
      throw new UnauthorizedException('Refresh token metadata missing');
    }
    if (meta['rotated'] === 'true') {
      throw new UnauthorizedException('Refresh token already rotated');
    }
  }
}
