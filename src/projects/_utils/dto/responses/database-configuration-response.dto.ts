import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DatabaseType } from 'src/projects/project.types';

export class DatabaseConfigurationResponseDto {
  @ApiProperty({ enum: DatabaseType, example: DatabaseType.MONGO })
  type: DatabaseType;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiPropertyOptional({ example: 'root' })
  rootUsername?: string;

  @ApiPropertyOptional({ example: true })
  hasRootPassword?: boolean;

  @ApiPropertyOptional({ example: 1 })
  replicaCount?: number;

  @ApiPropertyOptional({ example: 0.5 })
  ram?: number;

  @ApiPropertyOptional({ example: 0.1 })
  cpuCores?: number;

  @ApiPropertyOptional({ example: 5 })
  storage?: number;
}
