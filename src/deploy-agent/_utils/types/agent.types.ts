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

/** Body of every agent 4xx/5xx and of the `failed` SSE event. */
export interface AgentError {
  code: string;
  message: string;
  logs?: string;
}

export type DeploymentAction = 'start' | 'stop' | 'restart';

/** Item of GET /internal/projects/:projectId/deployments, replayed by the agent at boot. */
export type ReconcileItem = PutDeploymentBody & { id: string };
