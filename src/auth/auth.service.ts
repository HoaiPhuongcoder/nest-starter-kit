import { RegisterUserDto } from '@/auth/dtos/register-user.dto';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
  ) {}
  async register(registerUserDto: RegisterUserDto) {
    const { name, email, password } = registerUserDto;

    const user = await this.prismaService.user.findUnique({
      where: {
        email: email,
      },
    });
    if (user) {
      throw new ConflictException('Email này đã tồn tại');
    }
    const hashedPassword = await this.hashingService.hash(password);

    return await this.prismaService.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
  }
}
