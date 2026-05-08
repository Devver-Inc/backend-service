import { ApiProperty } from '@nestjs/swagger';

export class MongoConfigurationResponseDto {
  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: 'root' })
  rootUsername: string;

  @ApiProperty({ example: true })
  hasRootPassword: boolean;

  @ApiProperty({ example: 1 })
  replicaCount: number;

  @ApiProperty({ example: 0.5 })
  ram: number;

  @ApiProperty({ example: 0.1 })
  cpuCores: number;

  @ApiProperty({ example: 10 })
  storage: number;
}
