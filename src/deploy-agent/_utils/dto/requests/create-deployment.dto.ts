import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BRANCH_PATTERN,
  COMMIT_PATTERN,
  REPO_NAME_PATTERN,
} from '../../constants/validation-patterns';
import { ServiceConfig, Services } from '../../types/agent.types';
import { ExactlyOneService } from '../../validators/exactly-one-service.validator';

export class ServiceConfigDto implements ServiceConfig {
  @ApiPropertyOptional({ example: './apps/api' })
  @IsOptional()
  @IsString()
  root?: string;

  @ApiPropertyOptional({ example: 'npm install' })
  @IsOptional()
  @IsString()
  install?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  skipInstall?: boolean;

  @ApiPropertyOptional({ example: 'npm run build' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  build?: string;

  @ApiProperty({ example: 'npm run start:prod' })
  @IsString()
  @MinLength(1)
  start: string;
}

export class ServicesDto implements Services {
  @ApiPropertyOptional({ type: () => ServiceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceConfigDto)
  api?: ServiceConfigDto;

  @ApiPropertyOptional({ type: () => ServiceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceConfigDto)
  web?: ServiceConfigDto;
}

export class CreateAgentDeploymentDto {
  @ApiProperty({ example: 'my-repo' })
  @IsString()
  @Matches(REPO_NAME_PATTERN, { message: 'INVALID_REPO_NAME' })
  repo: string;

  @ApiProperty({ example: 'feature/new-feature' })
  @IsString()
  @Matches(BRANCH_PATTERN, { message: 'INVALID_BRANCH_NAME' })
  branch: string;

  @ApiPropertyOptional({ example: 'a1b2c3d' })
  @IsOptional()
  @IsString()
  @Matches(COMMIT_PATTERN, { message: 'INVALID_COMMIT_HASH' })
  commit?: string;

  @ApiProperty({ type: () => ServicesDto })
  @ExactlyOneService()
  @ValidateNested()
  @Type(() => ServicesDto)
  service: ServicesDto;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    example: {
      api: { DATABASE_SERVICE: 'database' },
    },
  })
  @IsOptional()
  @IsObject()
  links?: Record<string, Record<string, string>>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { DATABASE_URL: 'myapp_prod' },
  })
  @IsOptional()
  @IsObject()
  dbLinks?: Record<string, string>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { NODE_ENV: 'production', PORT: '3000' },
  })
  @IsOptional()
  @IsObject()
  env?: Record<string, string>;
}
