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
import { DatabaseConfigurationDto } from './database-configuration.dto';
import { MachineConfigurationDto } from './machine-configuration.dto';
import { OverlayAccessControlDto } from './overlay-access-control.dto';

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

  @ValidateNested()
  @Type(() => MachineConfigurationDto)
  machineConfiguration: MachineConfigurationDto;

  @IsArray()
  @IsString({ each: true })
  teamMemberIds: string[];

  @ValidateNested()
  @Type(() => OverlayAccessControlDto)
  overlayAccessControl: OverlayAccessControlDto;

  @Optional()
  @ValidateNested()
  @Type(() => DatabaseConfigurationDto)
  databaseConfiguration?: DatabaseConfigurationDto;
}
