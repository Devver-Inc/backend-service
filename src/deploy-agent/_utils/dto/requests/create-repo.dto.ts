import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { REPO_NAME_PATTERN } from '../../constants/validation-patterns';

export class CreateRepoDto {
  @ApiProperty({ example: 'my-repo' })
  @IsString()
  @MinLength(1)
  @Matches(REPO_NAME_PATTERN, { message: 'INVALID_REPO_NAME' })
  name: string;
}
