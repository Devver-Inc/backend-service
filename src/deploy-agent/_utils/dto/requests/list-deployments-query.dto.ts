import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { ROOT_COMMIT_PATTERN } from '../../constants/validation-patterns';

export class ListDeploymentsQueryDto {
  @ApiPropertyOptional({ example: '9fceb02d0ae598e95dc970b74767f19372d61af8' })
  @IsOptional()
  @IsString()
  @Matches(ROOT_COMMIT_PATTERN, { message: 'INVALID_ROOT_COMMIT' })
  rootCommit?: string;
}
