import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from 'src/utils/validators/match.decorator';

export class CreateUser {
  @IsString()
  @MinLength(10, { message: 'Tên phải có ít nhất 10 ký tự.' })
  @MaxLength(50, { message: 'Tên phải có ít hơn 50 ký tự.' })
  name: string;

  @IsEmail()
  @MinLength(10, { message: 'Email phải có ít nhất 10 ký tự.' })
  @MaxLength(50, { message: 'Email phải có ít hơn 50 ký tự.' })
  email: string;

  @IsString()
  @MinLength(10, { message: 'Mật khẩu phải có ít nhất 10 ký tự.' })
  @MaxLength(50, { message: 'Mật khẩu phải có ít hơn 50 ký tự.' })
  password: string;

  @IsString()
  @MinLength(10, { message: 'ConfirmPassword phải có ít nhất 10 ký tự.' })
  @MaxLength(50, { message: 'ConfirmPassword phải có ít hơn 50 ký tự.' })
  @Match('password', { message: 'Mật khẩu xác nhận không khớp!' })
  confirmPassword: string;
}
