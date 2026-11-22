import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Optional } from 'class-validator-extended';
import {
  DatabaseRequest,
  DatabaseSize,
  DatabaseType,
} from 'src/projects/project.types';

export class DatabaseConfigurationDto implements DatabaseRequest {
  @ApiProperty({ enum: DatabaseType, example: DatabaseType.POSTGRES })
  @IsEnum(DatabaseType)
  type: DatabaseType;

  @ApiPropertyOptional({
    example: '18',
    description: 'One of GET /databases/catalog; the default version if absent',
  })
  @Optional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ enum: DatabaseSize, default: DatabaseSize.S })
  @Optional()
  @IsEnum(DatabaseSize)
  size?: DatabaseSize;
}

export class ChangeDatabaseSizeDto {
  @ApiProperty({ enum: DatabaseSize })
  @IsEnum(DatabaseSize)
  size: DatabaseSize;
}
