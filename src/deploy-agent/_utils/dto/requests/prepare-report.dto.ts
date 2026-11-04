import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const STATUSES = ['running', 'done', 'failed'] as const;

export class PrepareErrorDto {
  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  logs?: string;
}

export class PrepareServiceDto {
  @ValidateIf((_, value) => value !== null)
  @IsIn(['web', 'api'])
  service: 'web' | 'api' | null;

  @IsString()
  @MaxLength(200)
  root: string;

  @IsIn(STATUSES)
  status: (typeof STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  durationMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  runtime?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrepareErrorDto)
  error?: PrepareErrorDto;
}

export class PrepareReportDto {
  @IsIn(STATUSES)
  status: (typeof STATUSES)[number];

  @Matches(/^([0-9a-f]{40}|[0-9a-f]{64})$/, { message: 'INVALID_COMMIT' })
  commit: string;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => PrepareServiceDto)
  services: PrepareServiceDto[];
}
