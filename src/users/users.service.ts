import { PrismaService } from '@/shared/services/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    try {
      return await this.prismaService.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: input.passwordHash,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targetField = error.meta?.target as string[];
          if (targetField.includes('email')) {
            throw new ConflictException('Email is exist');
          }
        }
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email: email,
      },
    });
  }
}
