import { IsNumber, Max, Min } from 'class-validator';

export class MachineConfigurationDto {
  @IsNumber()
  @Min(0.5)
  @Max(2)
  cpuCores: number;

  @IsNumber()
  @Min(0.5)
  @Max(2)
  ram: number;
}
