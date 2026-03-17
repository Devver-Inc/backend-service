import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ServiceConfig, Services } from '../../types/agent.types';
import { AtLeastOneService } from '../../validators/at-least-one-service.validator';

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

  @ApiProperty({ example: 'npm run build' })
  @IsString()
  @MinLength(1)
  build: string;

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
  @ApiProperty({ example: 'https://github.com/user/repo.git' })
  @IsString()
  @MinLength(1)
  repo: string;

  @ApiProperty({ example: 'feature/new-feature' })
  @IsString()
  @MinLength(1)
  branch: string;

  @ApiPropertyOptional({ example: 'a1b2c3d' })
  @IsOptional()
  @IsString()
  commit?: string;

  @ApiProperty({ type: () => ServicesDto })
  @AtLeastOneService()
  @ValidateNested()
  @Type(() => ServicesDto)
  services: ServicesDto;

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
    additionalProperties: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    example: {
      api: { NODE_ENV: 'production', PORT: '3000' },
      web: { API_URL: 'http://api:3000' },
    },
  })
  @IsOptional()
  @IsObject()
  env?: Record<string, Record<string, string>>;
}
