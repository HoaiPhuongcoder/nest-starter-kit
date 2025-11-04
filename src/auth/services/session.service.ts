import {
  SessionCreateParams,
  SessionMeta,
} from '@/auth/interfaces/session.interface';
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
  createdAt: number;
}

@Injectable()
export class SessionService {
  private readonly REFRESH_TTL_SEC: number;
  private readonly ACCESS_TTL_SEC: number;
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const rtTtlMs = configService.get<number>('REFRESH_TOKEN_MAX_AGE_MS');
    const acTtlMs = configService.get<number>('ACCESS_TOKEN_MAX_AGE_MS');
    if (!acTtlMs || acTtlMs <= 0 || !rtTtlMs || rtTtlMs <= 0) {
      throw new InternalServerErrorException('TTL MS is invalid');
    }
    this.REFRESH_TTL_SEC = Math.floor(rtTtlMs / 1000);
    this.REFRESH_TTL_SEC = Math.floor(acTtlMs / 1000);
  }

  private getCurrentKey(deviceId: string) {
    const currentKey = `session:${deviceId}:current`;
    return currentKey;
  }

  private getJtisSetKey(deviceId: string) {
    const jtisSetKey = `session:${deviceId}:jtis`;
    return jtisSetKey;
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

  async getMeta(deviceId: string, jti: string): Promise<SessionData | null> {
    const jtiKey = this.getJtiKey(deviceId, jti);
    const meta = await this.redisService.hGetAll(jtiKey);
    if (!meta || Object.keys(meta).length === 0) {
      return null;
    }

    return {
      ...meta,
      rotated: meta.rotated === 'true',
      createdAt: Number(meta.createdAt),
    } as SessionData;
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

  async createSession(params: SessionCreateParams): Promise<SessionMeta> {
    const { rtJti, atJti, deviceId, userId } = params;
    if (!rtJti || !atJti || !userId || !deviceId) {
      throw new InternalServerErrorException(
        'All session parameters are required',
      );
    }
    const currentKey = this.getCurrentKey(deviceId);
    const jtiKey = this.getJtiKey(deviceId, rtJti);
    const userDevicesKey = this.getUserDevicesKey(userId);
    const jtisSetKey = this.getJtisSetKey(deviceId);

    const oldJtis: string[] = await this.redisService.sMembers(jtisSetKey);
    const oldJtiKeys = oldJtis.map((jti) => this.getJtiKey(deviceId, jti));
    const sessionData: SessionData = {
      deviceId,
      userId,
      rotated: false,
      atJti,
      createdAt: Date.now(),
    };
    await this.redisService.executeOptimisticTransaction(
      [currentKey, jtisSetKey, ...oldJtiKeys],
      (multi) => {
        // Clear old session
        multi.unlink(currentKey);
        if (oldJtiKeys.length) {
          for (const key of oldJtiKeys) {
            multi.unlink(key);
          }
        }
        multi.unlink(jtisSetKey);

        // Create new session
        multi.set(currentKey, rtJti);
        multi.expire(currentKey, this.REFRESH_TTL_SEC);
        multi.hset(jtiKey, sessionData);
        multi.expire(jtiKey, this.REFRESH_TTL_SEC);
        multi.sadd(userDevicesKey, deviceId);
        multi.sadd(jtisSetKey, rtJti);
        multi.expire(jtisSetKey, this.REFRESH_TTL_SEC);
      },
    );
    return {
      userId,
      deviceId,
      jti: { at: atJti, rt: rtJti },
      createdAt: sessionData.createdAt,
      rotatedFrom: null,
      reused: false,
      accessTtlSec: this.ACCESS_TTL_SEC,
      refreshTtlSec: this.REFRESH_TTL_SEC,
    };
  }

  async logoutDevice(deviceId: string, userId: string): Promise<void> {
    if (!deviceId?.trim() || !userId?.trim()) return;
    const currentKey = this.getCurrentKey(deviceId);
    const userDevicesKey = this.getUserDevicesKey(userId);
    const jtisSetKey = this.getJtisSetKey(deviceId);
    const jtis: string[] = await this.redisService.sMembers(jtisSetKey);
    const jtiKeys = jtis.map((jti) => this.getJtiKey(deviceId, jti));

    try {
      await this.redisService.executeOptimisticTransaction(
        [currentKey, userDevicesKey, jtisSetKey, ...jtiKeys],
        (multi) => {
          multi.unlink(currentKey);
          multi.srem(userDevicesKey, deviceId);
          multi.unlink(...jtiKeys);
          multi.unlink(jtisSetKey);
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to logout device ${deviceId}: ${(error as Error).message}`,
      );
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    if (!userId.trim()) {
      throw new InternalServerErrorException(
        'Device ID and User ID are required',
      );
    }
    const userDevicesKey = this.getUserDevicesKey(userId);
    const deviceIds = await this.redisService.sMembers(userDevicesKey);
    if (!deviceIds || deviceIds.length === 0) {
      return;
    }
    const currentKeys: string[] = [];
    const jtisSetKeys: string[] = [];
    const jtiKeysToDelete: string[] = [];

    for (const deviceId of deviceIds) {
      const currentKey = this.getCurrentKey(deviceId);
      const jtisSetKey = this.getJtisSetKey(deviceId);

      currentKeys.push(currentKey);
      jtisSetKeys.push(jtisSetKey);
    }

    const BATCH = 100;
    for (let index = 0; index < jtisSetKeys.length; index += BATCH) {
      const slice = jtisSetKeys.slice(index, index + BATCH);
      const lists = await Promise.all(
        slice.map((key) => this.redisService.sMembers(key)),
      );
      lists.forEach((jtis, idx) => {
        const deviceId = deviceIds[index + idx];
        jtis.forEach((jti) =>
          jtiKeysToDelete.push(this.getJtiKey(deviceId, jti)),
        );
      });
    }
    // This is all key to delete
    const keysToDelete = [
      ...currentKeys,
      ...jtisSetKeys,
      ...jtiKeysToDelete,
      userDevicesKey,
    ];
    await this.redisService.executeOptimisticTransaction(
      [userDevicesKey, ...currentKeys, ...jtisSetKeys],
      (multi) => {
        multi.unlink(...keysToDelete);
      },
    );
  }

  async getSession(deviceId: string): Promise<SessionData | null> {
    if (!deviceId.trim()) {
      return null;
    }
    try {
      const currentJti = await this.getCurrentJti(deviceId);
      if (!currentJti) {
        return null;
      }
      const meta = await this.getMeta(deviceId, currentJti);
      if (!meta || Object.keys(meta).length === 0) {
        return null;
      }

      return meta;
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to get session for ${deviceId}: ${(err as Error).message}`,
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
    if (meta['rotated'] === true) {
      throw new UnauthorizedException('Refresh token already rotated');
    }
  }
}
