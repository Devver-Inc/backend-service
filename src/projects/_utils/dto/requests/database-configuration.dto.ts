import {
  IsEnum,
  IsInt,
  Matches,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DatabaseType } from 'src/projects/project.types';

export class DatabaseConfigurationDto {
  @IsEnum(DatabaseType)
  type: DatabaseType;

  // Inserted as-is in the connection string built by the Mongo chart.
  @IsString()
  @Matches(/^[A-Za-z0-9]+$/, { message: 'USERNAME_MUST_BE_ALPHANUMERIC' })
  username: string;

  @IsString()
  @Matches(/^[A-Za-z0-9]+$/, { message: 'PASSWORD_MUST_BE_ALPHANUMERIC' })
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
