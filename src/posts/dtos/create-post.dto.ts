import { IsString, IsUUID, Length } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @Length(5, 50, { message: 'Title must be 5 to 50 character' })
  title: string;

  @IsString()
  content: string;

  @IsUUID('7')
  authorId: string;
}
