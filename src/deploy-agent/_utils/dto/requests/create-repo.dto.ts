import { IsString, MinLength } from 'class-validator';

export class CreateRepoDto {
  @IsString()
  @MinLength(1)
  name: string;
}
