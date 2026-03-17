import { Logger } from '@nestjs/common';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { exit } from 'node:process';

export class DatabaseConfig {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  DATABASE_NAME: string;
}

export class LogtoConfig {
  @IsString()
  LOGTO_BASE_URL: string;

  @IsString()
  LOGTO_CLIENT_ID: string;

  @IsString()
  LOGTO_SECRET: string;

  @IsString()
  LOGTO_WEBHOOK_SIGNING_KEY: string;
}

export class ServerConfig {
  @IsNumber()
  PORT: number;

  @IsString()
  NODE_ENV: string;

  @IsString()
  FRONTEND_URL: string;
}

export class MinioConfig {
  @IsString()
  MINIO_ENDPOINT: string;

  @Transform(({ value }) =>
    value === null || value === undefined || value === ''
      ? null
      : Number(value),
  )
  @IsNumber()
  @IsOptional()
  MINIO_PORT?: number | null;

  @IsString()
  MINIO_ACCESS_KEY: string;

  @IsString()
  MINIO_SECRET_KEY: string;

  @IsString()
  MINIO_BUCKET_NAME: string;
}

export class CorsConfig {
  @IsString({ each: true })
  ALLOWED_ORIGINS: string[];
}

export class GitHubConfig {
  @IsString()
  GITHUB_TOKEN: string;

  @IsString()
  GITHUB_OWNER: string;

  @IsString()
  GITHUB_REPO: string;

  @IsString()
  GITHUB_BRANCH: string;
}
export class DeployAgentConfig {
  @IsString()
  DEPLOY_AGENT_SECRET: string;

  @IsString()
  K8S_BASE_DOMAIN: string;
}

export class EnvironmentVariables {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  DATABASE: DatabaseConfig;

  @ValidateNested()
  @Type(() => LogtoConfig)
  LOGTO: LogtoConfig;

  @ValidateNested()
  @Type(() => ServerConfig)
  SERVER: ServerConfig;

  @ValidateNested()
  @Type(() => MinioConfig)
  MINIO: MinioConfig;

  @ValidateNested()
  @Type(() => CorsConfig)
  CORS: CorsConfig;

  @ValidateNested()
  @Type(() => GitHubConfig)
  GITHUB: GitHubConfig;

  @ValidateNested()
  @Type(() => DeployAgentConfig)
  DEPLOY_AGENT: DeployAgentConfig;
}

export function validateEnv(config: Record<string, unknown>) {
  const structuredConfig = {
    DATABASE: {
      DATABASE_URL: config.DATABASE_URL,
      DATABASE_NAME: config.DATABASE_NAME,
    },
    LOGTO: {
      LOGTO_CLIENT_ID: config.LOGTO_CLIENT_ID,
      LOGTO_BASE_URL: config.LOGTO_BASE_URL,
      LOGTO_SECRET: config.LOGTO_SECRET,
      LOGTO_WEBHOOK_SIGNING_KEY: config.LOGTO_WEBHOOK_SIGNING_KEY,
    },
    SERVER: {
      PORT: config.PORT,
      NODE_ENV: config.NODE_ENV,
      FRONTEND_URL: config.FRONTEND_URL,
    },
    MINIO: {
      MINIO_ENDPOINT: config.MINIO_ENDPOINT,
      MINIO_PORT: config.MINIO_PORT,
      MINIO_ACCESS_KEY: config.MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY: config.MINIO_SECRET_KEY,
      MINIO_BUCKET_NAME: config.MINIO_BUCKET_NAME,
    },
    CORS: {
      ALLOWED_ORIGINS: config.CORS_ALLOWED_ORIGINS
        ? String(config.CORS_ALLOWED_ORIGINS)
            .split(',')
            .map((origin) => origin.trim())
        : [],
    },
    GITHUB: {
      GITHUB_TOKEN: config.GITHUB_TOKEN,
      GITHUB_OWNER: config.GITHUB_OWNER,
      GITHUB_REPO: config.GITHUB_REPO,
      GITHUB_BRANCH: config.GITHUB_BRANCH,
    },
    DEPLOY_AGENT: {
      DEPLOY_AGENT_SECRET: config.DEPLOY_AGENT_SECRET,
      K8S_BASE_DOMAIN: config.K8S_BASE_DOMAIN,
    },
  };

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    structuredConfig,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length) {
    new Logger(validateEnv.name).error(errors.toString());
    exit();
  }

  return validatedConfig;
}
