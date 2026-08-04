import { DeployRequest, Services } from './agent.types';

export interface PreparedDeployment {
  agentUrl: string;
  argoAppName: string;
  deployAgentBody: DeployRequest;
  mergedEnv?: Record<string, string>;
}

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
  dbLinks?: Record<string, string>;
  env?: Record<string, string>;
}

export enum AgentDeploymentStatus {
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  REMOVED = 'removed',
}
