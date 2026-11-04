import { ServiceName, Services } from './agent.types';
import { DatabaseLink } from 'src/projects/project.types';

export interface CreateRepoData {
  projectId: string;
  organizationId: string;
  name: string;
  rootCommit: string;
  displayName: string;
  install?: string;
}

export type PrepareStatus = 'running' | 'done' | 'failed';

export interface PrepareAppReport {
  root: string;
  status: PrepareStatus;
  durationMs?: number;
  runtime?: string | null;
  error?: { code: string; message: string; logs?: string };
}

export interface PrepareReport {
  status: PrepareStatus;
  commit: string;
  startedAt: string;
  finishedAt?: string;
  apps: PrepareAppReport[];
}

export interface UpsertDeploymentData {
  projectId: string;
  organizationId: string;
  repo: string;
  branch: string;
  serviceName: ServiceName;
  deploymentId: string;
  host: string;
  service: Services;
  dbLinks?: DatabaseLink[];
}
