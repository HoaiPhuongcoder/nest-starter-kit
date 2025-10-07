import { Match } from '@/utils/decorator/match.decorator';
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
