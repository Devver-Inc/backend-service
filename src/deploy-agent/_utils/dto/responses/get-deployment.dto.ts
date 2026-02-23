import { DeploymentStatus, ServiceConfig } from '../../../schemas/deployment.schema';

export class LogEntryDto {
  service: string;
  level: string;
  message: string;
  timestamp: string;
}

export class GetDeploymentDto {
  id: string;
  repo: string;
  branch: string;
  commit: string | null;
  services: Record<string, ServiceConfig>;
  status: DeploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class GetLogsDto {
  logs: LogEntryDto[];
}

export class RestoreResultDto {
  restoredRepos: number;
  restoredDeployments: number;
}
