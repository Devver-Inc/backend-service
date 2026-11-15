import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InitProjectDto {
  @ApiProperty({
    description: 'git rev-list --max-parents=0 HEAD',
    example: '9fceb02d0ae598e95dc970b74767f19372d61af8',
  })
  @Matches(/^([0-9a-f]{40}|[0-9a-f]{64})$/, { message: 'INVALID_ROOT_COMMIT' })
  rootCommit: string;

  @ApiPropertyOptional({ example: 'npm ci' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  install?: string;
}
