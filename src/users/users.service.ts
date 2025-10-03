import { PrismaService } from '@/shared/services/prisma.service';
import { CreateUser } from '@/users/dto/create-user.dto';
import { LoginBody } from '@/users/dto/login.dto';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async createUser(data: CreateUser) {
    const createData: Omit<CreateUser, 'confirmPassword'> = {
      name: data.name,
      email: data.email,
      password: data.password,
    };
    return this.prisma.user.create({
      data: createData,
    });
  }
  async login(data: LoginBody) {
    let user: { name: string } | null;

    try {
      // 1. Thử query để tìm user
      user = await this.prisma.user.findUnique({
        where: {
          email: data.email,
          password: data.password,
        },
        select: {
          name: true,
        },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Lỗi hệ thống, không thể truy vấn dữ liệu.',
      );
    }

    if (!user) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không chính xác.',
      );
    }

    return user;
  }
}
