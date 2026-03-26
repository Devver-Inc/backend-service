import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export const REPO_NAME_PATTERN = /^[a-z0-9-]+$/;

export class CreateRepoDto {
  @ApiProperty({ example: 'my-repo' })
  @IsString()
  @MinLength(1)
  @Matches(REPO_NAME_PATTERN)
  name: string;
}
