import { CreatePostDto } from '@/posts/dtos/create-post.dto';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostsService {
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {}
  async findAll() {
    console.log(this.configService.get<string>('DATABASE_URL'));
    return await this.prismaService.post.findMany({});
  }

  async createPost(data: CreatePostDto) {
    return await this.prismaService.post.create({
      data,
    });
  }
}
