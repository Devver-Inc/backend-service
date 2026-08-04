export enum PM2ProcessStatus {
  ONLINE = 'online',
  STOPPED = 'stopped',
  ERRORED = 'errored',
}

export enum LogEntryLevel {
  INFO = 'info',
  ERROR = 'error',
}

export enum DeployStage {
  VALIDATION = 'validation',
  SNAPSHOT = 'snapshot',
  WORKTREE = 'worktree',
  INSTALL = 'install',
  BUILD = 'build',
  PROCESS = 'process',
  NGINX = 'nginx',
  ROLLBACK = 'rollback',
}

export enum AgentErrorCode {
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  GIT_ERROR = 'GIT_ERROR',
  INSTALL_ERROR = 'INSTALL_ERROR',
  BUILD_ERROR = 'BUILD_ERROR',
  PROCESS_ERROR = 'PROCESS_ERROR',
  NGINX_ERROR = 'NGINX_ERROR',
  ROLLBACK_ERROR = 'ROLLBACK_ERROR',
  DEPLOY_ERROR = 'DEPLOY_ERROR',
  PORT_CONFLICT = 'PORT_CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export enum BackendErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  REPO_CREATE_FAILED = 'REPO_CREATE_FAILED',
  REPO_DELETE_FAILED = 'REPO_DELETE_FAILED',
  DEPLOYMENT_DELETE_FAILED = 'DEPLOYMENT_DELETE_FAILED',
  MONGO_DATABASES_FETCH_FAILED = 'MONGO_DATABASES_FETCH_FAILED',
  LOGS_FETCH_FAILED = 'LOGS_FETCH_FAILED',
  PM2_START_FAILED = 'PM2_START_FAILED',
  PM2_STOP_FAILED = 'PM2_STOP_FAILED',
  PM2_RESTART_FAILED = 'PM2_RESTART_FAILED',
}

export type ErrorCode = AgentErrorCode | BackendErrorCode;

export type ServiceName = 'web' | 'api';

export interface ServiceConfig {
  root?: string;
  install?: string;
  skipInstall?: boolean;
  build?: string;
  start: string;
}

export interface Services {
  api?: ServiceConfig;
  web?: ServiceConfig;
}

export interface CreateRepoRequest {
  name: string;
  baseUrl: string;
}

export interface DeployRequest {
  repo: string;
  branch: string;
  commit?: string;
  service: Partial<Record<ServiceName, ServiceConfig>>;
  env?: Record<string, string>;
  projectId?: string;
  organizationId?: string;
  overlayAccessControl: { commentPermission: string };
}

export interface RepoResponse {
  name: string;
  createdAt: string;
  pushUrl: string;
}

export interface PM2Process {
  name: string;
  pm_id: number;
  status: PM2ProcessStatus;
  cpu: number;
  memory: number;
}

export interface ServiceDeployResult {
  port: number;
  url: string;
}

export interface DeploymentResponse {
  repo: string;
  branch: string;
  deploymentId: string;
  commit: string;
  service: Partial<Record<ServiceName, ServiceDeployResult>>;
  process: PM2Process | null;
}

export type AgentDeploymentListItem = DeploymentResponse;

export interface DeployResponse extends DeploymentResponse {
  success: true;
  duration: number;
}

export interface DeployPhaseEvent {
  phase: DeployStage;
  durationMs: number;
}

export interface DeployStreamCallbacks {
  onPhase?: (event: DeployPhaseEvent) => void | Promise<void>;
  onComplete?: (event: DeployResponse) => void | Promise<void>;
  onError?: (event: ErrorResponse) => void | Promise<void>;
}

export interface RollbackStatus {
  attempted: boolean;
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    logs?: string;
    step?: number;
    stage?: DeployStage;
    service?: string;
    rollback?: RollbackStatus;
  };
  duration: number;
}

export interface AgentErrorPayload {
  type?: string;
  on?: string;
  error?:
    | string
    | {
        code?: string;
        message?: string;
        logs?: string;
        step?: number;
        stage?: string;
        service?: string;
        rollback?: {
          attempted?: boolean;
          success?: boolean;
          message?: string;
        };
      };
  message?: string;
}

export type DeploySseEvent =
  | { event: 'phase'; data: DeployPhaseEvent }
  | { event: 'complete'; data: DeployResponse }
  | { event: 'error'; data: ErrorResponse };

export interface LogEntry {
  service: string;
  level: LogEntryLevel;
  message: string;
  timestamp: string;
}

export interface LogsResponse {
  logs: LogEntry[];
}

export interface MongoDatabaseResponse {
  name: string;
  sizeOnDisk: number;
  empty: boolean;
}

export enum PM2Action {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
}

export interface PM2ActionResponse {
  success: true;
  name: string;
  action: PM2Action;
}
