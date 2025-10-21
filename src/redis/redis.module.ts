import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS',
      inject: [ConfigService],
      useFactory: (configServices: ConfigService) => {
        const client = new Redis({
          host: configServices.get<string>('REDIS_HOST'),
          port: Number.parseInt(
            configServices.get<string>('REDIS_PORT') || '6379',
          ),
          password: undefined,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
        });
        client.connect().catch(() => {});
        return client;
      },
    },
  ],
  exports: ['REDIS', RedisService],
})
export class RedisModule {}
