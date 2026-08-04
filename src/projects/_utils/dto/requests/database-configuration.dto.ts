import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DatabaseType } from 'src/projects/project.types';

export class DatabaseConfigurationDto {
  @IsEnum(DatabaseType)
  type: DatabaseType;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsInt()
  @Min(1)
  @Max(3)
  replicaCount: number;

  @IsNumber()
  @Min(0.5)
  ram: number;

  @IsNumber()
  @Min(0.1)
  cpuCores: number;

  @IsInt()
  @Min(1)
  @Max(5)
  storage: number;
}
