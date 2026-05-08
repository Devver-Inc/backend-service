import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class MongoConfigurationDto {
  @IsString()
  @IsNotEmpty()
  rootUsername: string;

  @IsString()
  @IsNotEmpty()
  rootPassword: string;

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
  @Min(10)
  @Max(500)
  storage: number;
}
