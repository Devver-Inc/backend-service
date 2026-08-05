import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { REPO_NAME_PATTERN } from '../../constants/validation-patterns';

export class ListDeploymentsQueryDto {
  @ApiPropertyOptional({ example: 'my-repo' })
  @IsOptional()
  @IsString()
  @Matches(REPO_NAME_PATTERN, { message: 'INVALID_REPO_NAME' })
  repo?: string;
}
