import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { HasMimeType, IsFile, MemoryStoredFile } from 'nestjs-form-data';

export class UpdateOrganizationDto {
  @Optional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @Optional()
  @IsString()
  @MaxLength(256)
  description?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Optional()
  @IsFile()
  @HasMimeType(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
  logoFile?: MemoryStoredFile;
}
