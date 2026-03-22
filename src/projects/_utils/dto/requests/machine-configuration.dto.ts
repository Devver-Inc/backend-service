import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class MachineConfigurationDto {
  @Optional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  cpuCores?: number;

  @Optional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  ram?: number;

  @Optional()
  @IsInt()
  @Min(10)
  @Max(500)
  storage?: number;
}
