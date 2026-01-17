import { IsInt, Max, Min } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class MachineConfigurationDto {
  @Optional()
  @IsInt()
  @Min(1)
  @Max(16)
  cpuCores?: number;

  @Optional()
  @IsInt()
  @Min(1)
  @Max(64)
  ram?: number;

  @Optional()
  @IsInt()
  @Min(10)
  @Max(500)
  storage?: number;
}
