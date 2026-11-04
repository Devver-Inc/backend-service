import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RepoServiceConfigDto {
  @ApiPropertyOptional({ example: 'apps/web' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  root?: string;

  @ApiPropertyOptional({ example: 'pnpm install --frozen-lockfile' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  install?: string;
}

export class RepoServicesDto {
  @ApiPropertyOptional({ type: RepoServiceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RepoServiceConfigDto)
  web?: RepoServiceConfigDto;

  @ApiPropertyOptional({ type: RepoServiceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RepoServiceConfigDto)
  api?: RepoServiceConfigDto;
}
