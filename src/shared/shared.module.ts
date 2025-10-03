import { PrismaService } from '@/shared/services/prisma.service';
import { Global, Module } from '@nestjs/common';
import { HashingService } from './services/hashing.service';

@Global()
@Module({
  providers: [PrismaService, HashingService],
  exports: [PrismaService, HashingService],
})
export class SharedModule {}
