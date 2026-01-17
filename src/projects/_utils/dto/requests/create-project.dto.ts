import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from 'class-validator-extended';
import { AccessControlDto } from './access-control.dto';
import { MachineConfigurationDto } from './machine-configuration.dto';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  name: string;

  @Optional()
  @IsString()
  @MaxLength(256)
  description?: string;

  @Optional()
  @ValidateNested()
  @Type(() => MachineConfigurationDto)
  machineConfiguration?: MachineConfigurationDto;

  @Optional()
  @IsArray()
  @IsString({ each: true })
  teamMemberIds?: string[];

  @Optional()
  @ValidateNested()
  @Type(() => AccessControlDto)
  accessControl?: AccessControlDto;
}
