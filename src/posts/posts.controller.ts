import { CreatePostDto } from '@/posts/dtos/create-post.dto';
import { PostsService } from '@/posts/posts.service';
import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}
  @Get()
  async findAll() {
    return await this.postsService.findAll();
  }
  @Post()
  async createPost(@Body() createPostBody: CreatePostDto) {
    const data = await this.postsService.createPost(createPostBody);
    return {
      message: 'Tạo bài post thành công',
      data,
    };
  }
}
