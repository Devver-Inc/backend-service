import { Services } from './agent.types';

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
  deploymentId: string;
  commit?: string;
  argoAppName?: string;
  service: Services;
  links?: Record<string, Record<string, string>>;
  env?: Record<string, string>;
}

export enum AgentDeploymentStatus {
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  REMOVED = 'removed',
}
