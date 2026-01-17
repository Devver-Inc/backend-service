import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { HasMimeType, IsFile, MemoryStoredFile } from 'nestjs-form-data';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  name: string;

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
