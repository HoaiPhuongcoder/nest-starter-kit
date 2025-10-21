import { RedisService } from '@/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenStoreService {
  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}
}
