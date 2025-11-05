import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '@/config/validation-env.schema';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RedisModule } from './redis/redis.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot({
      errorMessage:
        'Bạn đã yêu cầu làm mới quá nhanh. Vui lòng thử lại sau 1 phút.',
      throttlers: [
        {
          name: 'default',
          ttl: 10000, // 10 giây
          limit: 10, // 10 lần
        },
      ],
    }),
    PostsModule,
    UsersModule,
    SharedModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
