import { PrismaService } from '@/shared/services/prisma.service';
import { Global, Module } from '@nestjs/common';
import { HashingService } from './services/hashing.service';
import { JwtTokenService } from './services/jwt-token.service';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [PrismaService, HashingService, JwtTokenService],
  exports: [PrismaService, HashingService, JwtTokenService],
})
export class SharedModule {}
