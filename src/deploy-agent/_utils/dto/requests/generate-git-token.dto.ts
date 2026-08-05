import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { REPO_NAME_PATTERN } from '../../constants/validation-patterns';

export class GenerateGitTokenDto {
  @ApiProperty({ example: 'my-repo' })
  @IsString()
  @Matches(REPO_NAME_PATTERN, { message: 'INVALID_REPO_NAME' })
  repo: string;
}
