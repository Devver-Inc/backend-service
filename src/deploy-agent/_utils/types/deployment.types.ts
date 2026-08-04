import { DeployRequest, Services } from './agent.types';
import { DatabaseLink } from 'src/projects/project.types';

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
  dbLinks?: DatabaseLink[];
  env?: Record<string, string>;
}

export enum AgentDeploymentStatus {
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  REMOVED = 'removed',
}
