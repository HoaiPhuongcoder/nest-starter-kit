import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS') private readonly redis: Redis) {}

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

  async hset(key: string, object: Record<string, string | number | boolean>) {
    const flat = Object.entries(object).flatMap(([key, value]) => [
      key,
      String(value),
    ]);
    return await this.redis.hset(key, ...flat);
  }

  async hgetall<T = Record<string, string>>(key: string): Promise<T> {
    return (await this.redis.hgetall(key)) as T;
  }

  async expire(key: string, ttlSeconds: number) {
    return await this.redis.expire(key, ttlSeconds);
  }

  pipeline() {
    return this.redis.pipeline();
  }
}
