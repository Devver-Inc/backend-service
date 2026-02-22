import { ServiceConfig } from './agent.types';

export interface CreateRepoData {
  projectId: string;
  organizationId: string;
  name: string;
  pushUrl: string;
}

export interface CreateDeploymentData {
  projectId: string;
  organizationId: string;
  repo: string;
  branch: string;
  commit?: string;
  services: Record<string, ServiceConfig>;
  links?: Record<string, Record<string, string>>;
  env?: Record<string, Record<string, string>>;
}

export enum DeploymentStatus {
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  REMOVED = 'removed',
}
