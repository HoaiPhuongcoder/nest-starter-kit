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

  async rotateSession(params: {
    deviceId: string;
    userId: string;
    oldRtJti: string;
    newRtJti: string;
    newAtJti: string;
  }) {
    const { deviceId, userId, oldRtJti, newRtJti, newAtJti } = params;
    if (!deviceId || !userId || !oldRtJti || !newRtJti || !newAtJti) {
      throw new InternalServerErrorException(
        'All rotation parameters are required',
      );
    }
    await this.validateDeviceSession({ deviceId, userId, jti: oldRtJti });
    const currentKey = this.getCurrentKey(deviceId);
    const oldJtiKey = this.getJtiKey(deviceId, oldRtJti);
    const newJtiKey = this.getJtiKey(deviceId, newRtJti);
    const userDevicesKey = this.getUserDevicesKey(userId);
    const jtisSetKey = this.getJtisSetKey(deviceId);

    const oldSessionData = await this.getMeta(deviceId, oldRtJti);
    if (!oldSessionData) {
      throw new UnauthorizedException('Session data not found for rotation');
    }

    const newSessionData: SessionData = {
      ...oldSessionData,
      atJti: newAtJti,
      rotated: false,
      createdAt: Date.now(),
    };
    const REUSE_TTL_SEC = Math.min(this.REFRESH_TTL_SEC, 24 * 3600);
    try {
      await this.redisService.executeOptimisticTransaction(
        [currentKey, oldJtiKey, newJtiKey, userDevicesKey, jtisSetKey],
        (multi) => {
          // Set Rotated for old key
          multi.hset(oldJtiKey, 'rotated', 'true');
          multi.hset(oldJtiKey, 'rotatedAt', Date.now().toString());
          multi.expire(oldJtiKey, REUSE_TTL_SEC);
          // Promote new JTI to current
          multi.set(currentKey, newRtJti, 'EX', this.REFRESH_TTL_SEC);
          // Write new JTI meta
          multi.hset(newJtiKey, newSessionData);
          multi.expire(newJtiKey, this.REFRESH_TTL_SEC);
          // Track JTIs  device
          multi.sadd(jtisSetKey, newRtJti);
          multi.expire(jtisSetKey, this.REFRESH_TTL_SEC);
          // Ensure membership
          multi.sadd(userDevicesKey, deviceId);
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to rotate session for device ${deviceId}: ${(error as Error).message}`,
      );
    }
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
  }): Promise<SessionData> {
    let { userId, deviceId, jti } = params;
    userId = userId?.trim();
    deviceId = deviceId?.trim();
    jti = jti?.trim();
    if (!userId || !deviceId || !jti) {
      throw new UnauthorizedException('Invalid session parameters');
    }

    const userDevicesKey = this.getUserDevicesKey(userId);
    const currentKey = this.getCurrentKey(deviceId);
    const jtiKey = this.getJtiKey(deviceId, jti);

    // 1 round-trip: SISMEMBER + GET + HGETALL
    const pipe = this.redisService.pipeline();
    pipe.sismember(userDevicesKey, deviceId); // → 0/1
    pipe.get(currentKey); // → string|null
    pipe.hgetall(jtiKey);
    const results = await pipe.exec();
    if (!results) {
      throw new UnauthorizedException('Redis pipeline failed');
    }

    const unwrap = <T>(r: [Error | null, unknown], msg?: string): T => {
      const [err, val] = r;
      if (err) throw new UnauthorizedException(msg ?? err.message);
      return val as T;
    };

    const isMemberRaw = unwrap<number>(results[0], 'Membership check failed');
    const currentJti = unwrap<string | null>(results[1], 'Read current failed');
    const metaRaw = unwrap<Record<string, string>>(
      results[2],
      'Read metadata failed',
    );

    const isMember = !!Number(isMemberRaw);
    if (!isMember) throw new UnauthorizedException('Device not linked to user');
    if (!currentJti) throw new UnauthorizedException('Session not found');
    if (currentJti !== jti) {
      throw new UnauthorizedException(
        'Refresh token is not current (possible reuse)',
      );
    }
    if (!metaRaw || Object.keys(metaRaw).length === 0) {
      throw new UnauthorizedException('Refresh token metadata missing');
    }

    const meta: SessionData = {
      userId: metaRaw.userId,
      deviceId: metaRaw.deviceId,
      atJti: metaRaw.atJti,
      rotated: metaRaw.rotated === 'true',
      createdAt: Number(metaRaw.createdAt),
    };

    // Ràng buộc nhất quán + các cờ bổ sung
    if (meta.userId !== userId || meta.deviceId !== deviceId) {
      throw new UnauthorizedException('Session metadata mismatch');
    }
    if (meta.rotated) {
      throw new UnauthorizedException('Refresh token already rotated');
    }
    return meta; // giúp bước rotate dùng luôn, không cần getMeta lần nữa
  }
}
