import { IsEmail, IsString, IsUUID, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(5, 50)
  password: string;

  @IsUUID()
  deviceId: string;
}

export class LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  constructor(partial: Partial<LoginResponseDto>) {
    Object.assign(this, partial);
  }
}
