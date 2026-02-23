import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Optional } from 'class-validator-extended';
import { ContainerConfigDto } from './container-config.dto';
import { PersistenceConfigDto } from './persistence-config.dto';
import { ResourcesConfigDto } from './resources-config.dto';

export class CreateDeploymentDto {
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @Optional()
  @IsString()
  organizationDomain?: string;

  @ValidateNested()
  @Type(() => ContainerConfigDto)
  container: ContainerConfigDto;

  @ValidateNested()
  @Type(() => ResourcesConfigDto)
  resources: ResourcesConfigDto;

  @ValidateNested()
  @Type(() => PersistenceConfigDto)
  persistence: PersistenceConfigDto;

  @IsInt()
  @Min(1)
  @Max(10)
  replicaCount: number;

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
  @IsObject()
  labels?: Record<string, string>;

  @Optional()
  @IsObject()
  annotations?: Record<string, string>;
}
