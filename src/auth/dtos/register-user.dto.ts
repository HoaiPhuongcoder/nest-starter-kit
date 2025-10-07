import { Match } from '@/utils/decorator/match.decorator';
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(5, 50)
  name: string;

  @IsString()
  @Length(5, 50)
  password: string;

  @IsString()
  @Length(5, 50)
  @Match('password')
  confirmPassword: string;
}

@Exclude()
export class RegisterUserResponseDto {
  @Expose()
  id: string;
  @Expose()
  email: string;
  @Expose()
  name: string;

  password: string;

  @Expose()
  createAt: Date;
  @Expose()
  updateAt: Date;

  constructor(partial: Partial<RegisterUserResponseDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  get fullName() {
    return this.name + 'Bố Mày';
  }
}
