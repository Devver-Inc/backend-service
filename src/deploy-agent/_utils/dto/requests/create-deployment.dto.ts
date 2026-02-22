import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ServiceConfigDto {
  @ApiPropertyOptional({ example: './apps/api' })
  @IsOptional()
  @IsString()
  root?: string;

  @ApiPropertyOptional({ example: 'npm install' })
  @IsOptional()
  @IsString()
  install?: string;

  @ApiProperty({ example: 'npm run build' })
  @IsString()
  @MinLength(1)
  build: string;

  @ApiProperty({ example: 'npm run start:prod' })
  @IsString()
  @MinLength(1)
  start: string;

  @ApiPropertyOptional({ example: ['database', 'redis'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  depends?: string[];
}

export class CreateDeploymentDto {
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

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/ServiceConfigDto' },
    example: {
      api: {
        root: './apps/api',
        build: 'npm run build',
        start: 'npm run start:prod',
        depends: ['database'],
      },
      web: {
        root: './apps/web',
        build: 'npm run build',
        start: 'npm run start',
      },
    },
  })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => ServiceConfigDto)
  services: Record<string, ServiceConfigDto>;

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
