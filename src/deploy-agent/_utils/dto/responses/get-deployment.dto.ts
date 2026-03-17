import { DeploymentStatus, Services } from '../../../schemas/deployment.schema';
import { PM2Action } from '../../types/agent.types';

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
  services: Services;
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

export class ControlPm2ProcessResultDto {
  success: boolean;
  name: string;
  action: PM2Action;
}
