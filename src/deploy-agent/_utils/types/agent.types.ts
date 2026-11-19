// Mirror of the agent's contract (deploy-agent/agent/src/contract.ts).

export type ServiceName = 'web' | 'api';

export interface ServiceConfig {
  root?: string;
  install?: string;
  build?: string;
  start?: string;
}

export type Services = Partial<Record<ServiceName, ServiceConfig>>;

export interface PutDeploymentBody {
  repo: string;
  ref: string;
  host: string;
  /** Branch URLs; the agent takes them from any other deployment once this one serves. */
  aliases?: string[];
  service: ServiceConfig;
  env?: Record<string, string>;
}

export interface DeploymentStatus {
  id: string;
  repo: string;
  ref: string;
  commit: string;
  host: string;
  status: 'running' | 'stopped' | 'failed';
  startedAt: string;
}

export interface AgentError {
  code: string;
  message: string;
  logs?: string;
}

export type DeploymentAction = 'start' | 'stop' | 'restart';

export type ReconcileItem = PutDeploymentBody & { id: string };
