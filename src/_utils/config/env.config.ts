import { Logger } from '@nestjs/common';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { exit } from 'node:process';

/** Env booleans must be parsed before plainToInstance: implicitConversion treats any non-empty string as true. */
function parseEnvBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

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

export class StorageConfig {
  @IsUrl({ require_tld: false })
  @IsOptional()
  STORAGE_ENDPOINT?: string;

  @IsString()
  STORAGE_REGION: string;

  @ValidateIf((config: StorageConfig) => Boolean(config.STORAGE_SECRET_KEY))
  @IsString()
  STORAGE_ACCESS_KEY?: string;

  @ValidateIf((config: StorageConfig) => Boolean(config.STORAGE_ACCESS_KEY))
  @IsString()
  STORAGE_SECRET_KEY?: string;

  @IsString()
  STORAGE_BUCKET: string;

  @IsUrl({ require_tld: false })
  STORAGE_PUBLIC_URL: string;

  @IsBoolean()
  STORAGE_FORCE_PATH_STYLE: boolean;
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
  /** Master key: each project's agent token is HMAC(DEPLOY_AGENT_SECRET, projectId). */
  @IsString()
  @MinLength(32)
  DEPLOY_AGENT_SECRET: string;

  @IsString()
  K8S_BASE_DOMAIN: string;

  /** Backend URL reachable from inside the cluster, handed to agents for reconciliation. */
  @IsUrl({ require_tld: false })
  BACKEND_INTERNAL_URL: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  GIT_GATEWAY_SECRET?: string;

  /** Host in the repos' push URL: ssh://<projectId>@<GIT_SSH_HOST>/app/repos/<name>.git */
  @IsString()
  GIT_SSH_HOST: string;
}

export class ArgoCdConfig {
  @IsUrl({ require_tld: false })
  ARGOCD_BASE_URL: string;

  @IsString()
  ARGOCD_API_KEY: string;
}

export class VaultConfig {
  @IsUrl({ require_tld: false })
  VAULT_ADDR: string;

  @IsString()
  VAULT_KV_MOUNT: string;

  @IsString()
  VAULT_AUTH_MOUNT: string;

  @IsString()
  VAULT_ROLE: string;

  /** Local development only; in the cluster the backend logs in with its service account. */
  @IsOptional()
  @IsString()
  VAULT_TOKEN?: string;
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
  @Type(() => StorageConfig)
  STORAGE: StorageConfig;

  @ValidateNested()
  @Type(() => CorsConfig)
  CORS: CorsConfig;

  @ValidateNested()
  @Type(() => GitHubConfig)
  GITHUB: GitHubConfig;

  @ValidateNested()
  @Type(() => DeployAgentConfig)
  DEPLOY_AGENT: DeployAgentConfig;

  @ValidateNested()
  @Type(() => VaultConfig)
  VAULT: VaultConfig;

  @ValidateNested()
  @Type(() => ArgoCdConfig)
  ARGOCD: ArgoCdConfig;
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
    STORAGE: {
      STORAGE_ENDPOINT: config.STORAGE_ENDPOINT,
      STORAGE_REGION: config.STORAGE_REGION,
      STORAGE_ACCESS_KEY: config.STORAGE_ACCESS_KEY,
      STORAGE_SECRET_KEY: config.STORAGE_SECRET_KEY,
      STORAGE_BUCKET: config.STORAGE_BUCKET,
      STORAGE_PUBLIC_URL: config.STORAGE_PUBLIC_URL,
      STORAGE_FORCE_PATH_STYLE: parseEnvBoolean(
        config.STORAGE_FORCE_PATH_STYLE,
      ),
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
      BACKEND_INTERNAL_URL: config.BACKEND_INTERNAL_URL,
      GIT_GATEWAY_SECRET: config.GIT_GATEWAY_SECRET,
      GIT_SSH_HOST: config.GIT_SSH_HOST,
    },
    VAULT: {
      VAULT_ADDR: config.VAULT_ADDR,
      VAULT_KV_MOUNT: config.VAULT_KV_MOUNT ?? 'devver_K8s',
      VAULT_AUTH_MOUNT: config.VAULT_AUTH_MOUNT ?? 'devver_k8s_prod',
      VAULT_ROLE: config.VAULT_ROLE ?? 'backend-service',
      VAULT_TOKEN: config.VAULT_TOKEN,
    },
    ARGOCD: {
      ARGOCD_BASE_URL: config.ARGOCD_BASE_URL,
      ARGOCD_API_KEY: config.ARGOCD_API_KEY,
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
