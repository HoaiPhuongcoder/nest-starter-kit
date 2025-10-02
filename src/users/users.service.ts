import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUser } from 'src/users/dto/create-user.dto';
import { LoginBody } from 'src/users/dto/login.dto';

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
      // 2. Nếu query thất bại (VD: mất kết nối DB), bắt lỗi ở đây
      console.error(error); // Ghi lại log lỗi để debug
      throw new InternalServerErrorException(
        'Lỗi hệ thống, không thể truy vấn dữ liệu.',
      );
    }

    // 3. Nếu không tìm thấy user hoặc mật khẩu sai, trả về lỗi 401
    if (!user) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không chính xác.',
      );
    }

    return user;
  }
}
