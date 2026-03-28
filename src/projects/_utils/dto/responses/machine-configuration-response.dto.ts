import { ApiProperty } from '@nestjs/swagger';

export class MachineConfigurationResponseDto {
  @ApiProperty({ example: 4 })
  cpuCores: number;

  @ApiProperty({ example: 8 })
  ram: number;

  @ApiProperty({ example: 100 })
  storage: number;
}
