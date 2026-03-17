import { ApiProperty } from '@nestjs/swagger';
import { HasMimeType, IsFile, MemoryStoredFile } from 'nestjs-form-data';

export class UpdateOrganizationLogoDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @IsFile()
  @HasMimeType(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
  logoFile: MemoryStoredFile;
}
