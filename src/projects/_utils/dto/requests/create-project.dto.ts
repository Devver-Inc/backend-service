import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Optional } from 'class-validator-extended';
import { AccessControlDto } from './access-control.dto';
import { ContainerConfigDto } from './container-config.dto';
import { MachineConfigurationDto } from './machine-configuration.dto';
import { PersistenceConfigDto } from './persistence-config.dto';
import { ResourcesConfigDto } from './resources-config.dto';

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
  @Type(() => AccessControlDto)
  accessControl: AccessControlDto;

  // Deployment configuration
  @ValidateNested()
  @Type(() => ContainerConfigDto)
  container: ContainerConfigDto;

  @Optional()
  @ValidateNested()
  @Type(() => ResourcesConfigDto)
  resources?: ResourcesConfigDto;

  @Optional()
  @ValidateNested()
  @Type(() => PersistenceConfigDto)
  persistence?: PersistenceConfigDto;

  @Optional()
  @IsInt()
  @Min(1)
  @Max(10)
  replicaCount?: number;

  @Optional()
  @IsInt()
  @Min(1)
  @Max(65535)
  httpPort?: number;

  @Optional()
  @IsInt()
  @Min(1)
  @Max(65535)
  httpsPort?: number;

  @Optional()
  @IsString()
  organizationDomain?: string;

  @Optional()
  @IsObject()
  labels?: Record<string, string>;

  @Optional()
  @IsObject()
  annotations?: Record<string, string>;
}
