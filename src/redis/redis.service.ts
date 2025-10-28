import {
  TransactionConflictError,
  TransactionFailedError,
} from '@/redis/redis.errors';
import { TransactionFn } from '@/redis/redis.types';
import {
  backoffDelayMs,
  dedupeKeys,
  firstError,
  isTransient,
  toResults,
} from '@/redis/redis.utils';
import { Inject, Injectable } from '@nestjs/common';
import Redis, { ChainableCommander } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS') private readonly redis: Redis) {}

  getClient(): Redis {
    return this.redis;
  }

  async set(key: string, value: string, ttl?: number) {
    return ttl
      ? this.redis.set(key, value, 'EX', ttl)
      : this.redis.set(key, value);
  }
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async del(key: string) {
    return this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.redis.exists(key);
    return res === 1;
  }

  async hSet(key: string, object: Record<string, string | number | boolean>) {
    const flat = Object.entries(object).flatMap(([key, value]) => [
      key,
      String(value),
    ]);
    return await this.redis.hset(key, ...flat);
  }

  async hGetAll<T = Record<string, string>>(key: string): Promise<T> {
    return (await this.redis.hgetall(key)) as T;
  }

  async sIsMember(key: string, value: string): Promise<boolean> {
    const result = await this.redis.sismember(key, value);
    return result === 1;
  }
  async sAdd(key: string, value: string): Promise<number> {
    return await this.redis.sadd(key, value);
  }

  async sRem(key: string, value: string): Promise<number> {
    return await this.redis.srem(key, value);
  }

  async sMembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async expire(key: string, ttlSeconds: number) {
    return await this.redis.expire(key, ttlSeconds);
  }

  async executeTransaction<T = any>(
    transactionFn: (multi: ChainableCommander) => void,
  ): Promise<T[]> {
    const multi = this.redis.multi();
    try {
      transactionFn(multi);
      const result = await multi.exec();
      if (!result) {
        throw new Error('Transaction failed - no results returned');
      }

      const errors = result.filter(([err]) => err !== null);

      if (errors.length > 0) {
        throw new Error(
          `Transaction failed: ${errors.map(([err]) => (err as Error).message).join(', ')}`,
        );
      }
      return result.map(([, result]) => result) as T[];
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Redis transaction failed: ${err.message}`);
      }
      throw new Error('Redis transaction failed (unknown error)');
    }
  }

  async executeOptimisticTransaction<T = any>(
    watchKey: string[],
    transactionFn: TransactionFn,
    maxRetries: number = 3,
  ): Promise<T[]> {
    const keys = dedupeKeys(watchKey);
    const retries = Math.max(1, maxRetries);
    for (let attempt = 1; attempt <= retries; attempt++) {
      let result: [Error | null, any][] | null;
      try {
        if (keys.length > 0) {
          await this.redis.watch(...keys);
        }

        const multi = this.redis.multi();

        await Promise.resolve(transactionFn(multi));

        result = await multi.exec();

        if (result === null) {
          if (attempt === retries) {
            throw new TransactionConflictError(attempt);
          }
          await this.delay(backoffDelayMs(attempt));
          continue;
        }

        const errors = firstError(result);
        if (errors) {
          throw new Error(`Transaction commands failed: ${errors.message}`);
        }
        return toResults(result);
      } catch (err) {
        if (isTransient(err)) {
          if (attempt === retries) {
            throw new Error(
              `Redis optimistic transaction failed after ${attempt} attempt(s): ${(err as Error).message}`,
            );
          }
          await this.delay(backoffDelayMs(attempt));
          continue;
        }
        throw new TransactionFailedError(err as Error);
      } finally {
        await this.redis.unwatch();
      }
    }
    throw new Error('Transaction failed without a result');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  pipeline() {
    return this.redis.pipeline();
  }
}
