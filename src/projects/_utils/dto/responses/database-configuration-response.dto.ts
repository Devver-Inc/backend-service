import { ApiProperty } from '@nestjs/swagger';
import { DatabaseSize, DatabaseType } from 'src/projects/project.types';

export class DatabaseConfigurationResponseDto {
  @ApiProperty({ example: 'postgres' })
  name: string;

  @ApiProperty({ enum: DatabaseType, example: DatabaseType.POSTGRES })
  type: DatabaseType;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: '18' })
  version: string;

  @ApiProperty({
    example: false,
    description: 'No longer offered to new databases; this one keeps running',
  })
  deprecated: boolean;

  @ApiProperty({ enum: DatabaseSize, example: DatabaseSize.S })
  size: DatabaseSize;

  @ApiProperty({ example: '5Gi', description: 'Fixed at creation' })
  disk: string;
}

export class DatabaseCredentialsResponseDto {
  @ApiProperty({ example: 'devver', description: 'Empty for Valkey' })
  username: string;

  @ApiProperty({ example: '3f2a9c1e5b7d4e8a9c217d4e5f6a8b90' })
  password: string;

  @ApiProperty({ example: 5432 })
  port: number;
}

export class DatabaseCatalogResponseDto {
  @ApiProperty({ enum: DatabaseType })
  type: DatabaseType;

  @ApiProperty({ example: '18' })
  defaultVersion: string;

  @ApiProperty({ example: ['18', '17', '16'] })
  versions: string[];

  @ApiProperty({
    example: [{ size: 's', cpu: 1, memory: '1536Mi', disk: '5Gi' }],
  })
  sizes: { size: DatabaseSize; cpu: number; memory: string; disk: string }[];
}
