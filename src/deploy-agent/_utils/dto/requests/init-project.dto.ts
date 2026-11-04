import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RepoServicesDto } from './repo-services.dto';

export class InitProjectDto {
  @ApiProperty({
    description: 'git rev-list --max-parents=0 HEAD',
    example: '9fceb02d0ae598e95dc970b74767f19372d61af8',
  })
  @Matches(/^([0-9a-f]{40}|[0-9a-f]{64})$/, { message: 'INVALID_ROOT_COMMIT' })
  rootCommit: string;

  @ApiProperty({
    description: 'git remote name, else the manifest name, else the folder',
    example: 'shop-web',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ example: 'npm ci' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  install?: string;

  @ApiPropertyOptional({
    type: RepoServicesDto,
    example: { web: { root: 'apps/web' }, api: { root: 'apps/api' } },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RepoServicesDto)
  services?: RepoServicesDto;
}
