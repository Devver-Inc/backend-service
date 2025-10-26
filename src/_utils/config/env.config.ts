import { exit } from 'process';
import { IsBoolean, IsNumber, IsString, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Logger } from '@nestjs/common';

export class EnvironmentVariables {
  @IsNumber()
  PORT: number = 3000;

  @IsString()
  NODE_ENV: string = 'development';

  @IsString()
  FRONT_URL: string = 'http://localhost:3020';

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRATION: string;

  @IsNumber()
  REFRESH_TOKEN_EXPIRATION_DAYS: number = 7;

  @IsNumber()
  REFRESH_TOKEN_EXPIRATION_DAYS_REMEMBER_ME: number = 30;

  @IsString()
  MONGODB_URI: string;

  @IsString()
  SMTP_HOST: string;

  @IsString()
  SMTP_FROM: string;

  @IsString()
  SMTP_PORT: string;

  @IsString()
  SMTP_USER: string;

  @IsString()
  SMTP_PASSWORD: string;

  @IsBoolean()
  SMTP_PREVIEW: boolean = false;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length) {
    new Logger(validateEnv.name).error(errors.toString());
    exit();
  }
  return validatedConfig;
}
