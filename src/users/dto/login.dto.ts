import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginBody {
  @IsEmail()
  @MinLength(10, { message: 'Email phải có ít nhất 10 ký tự.' })
  @MaxLength(50, { message: 'Email phải có ít hơn 50 ký tự.' })
  email: string;
  @IsString()
  @MinLength(10, { message: 'Password phải có ít nhất 10 ký tự.' })
  @MaxLength(50, { message: 'Password phải có ít hơn 50 ký tự.' })
  password: string;
}
