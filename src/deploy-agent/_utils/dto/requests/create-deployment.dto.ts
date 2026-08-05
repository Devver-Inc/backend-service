import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DatabaseLink, DatabaseType } from 'src/projects/project.types';
import {
  BRANCH_PATTERN,
  COMMIT_PATTERN,
  REPO_NAME_PATTERN,
} from '../../constants/validation-patterns';
import { ServiceConfig, Services } from '../../types/agent.types';
import { ExactlyOneService } from '../../validators/exactly-one-service.validator';
import { IsStringRecord } from '../../validators/is-string-record.validator';

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
  @IsBoolean()
  skipInstall?: boolean;

  @ApiPropertyOptional({ example: 'npm run build' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  build?: string;

  @ApiPropertyOptional({ example: 'npm run start:prod' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  start?: string;
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

export class DatabaseLinkDto implements DatabaseLink {
  @ApiProperty({ example: 'DATABASE_URL' })
  @IsString()
  @Matches(/^[A-Za-z_][A-Za-z0-9_]*$/, { message: 'INVALID_ENV_NAME' })
  env: string;

  @ApiProperty({ enum: DatabaseType, example: DatabaseType.MONGO })
  @IsEnum(DatabaseType)
  engine: DatabaseType;

  @ApiProperty({ example: 'myapp_prod' })
  @IsString()
  @IsNotEmpty()
  database: string;
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
    type: () => DatabaseLinkDto,
    isArray: true,
    example: [
      {
        env: 'DATABASE_URL',
        engine: DatabaseType.MONGO,
        database: 'myapp_prod',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((link: DatabaseLinkDto) => link.env)
  @ValidateNested({ each: true })
  @Type(() => DatabaseLinkDto)
  dbLinks?: DatabaseLinkDto[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { NODE_ENV: 'production', PORT: '3000' },
  })
  @IsOptional()
  @IsStringRecord()
  env?: Record<string, string>;
}
