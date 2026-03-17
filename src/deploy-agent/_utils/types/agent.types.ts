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
  CLONE = 'clone',
  INSTALL = 'install',
  BUILD = 'build',
  PROCESS = 'process',
  NGINX = 'nginx',
  ROLLBACK = 'rollback',
  DEPLOY = 'deploy',
}

export enum ErrorCode {
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INSTALL_ERROR = 'INSTALL_ERROR',
  BUILD_ERROR = 'BUILD_ERROR',
  PROCESS_ERROR = 'PROCESS_ERROR',
  NGINX_ERROR = 'NGINX_ERROR',
  GIT_ERROR = 'GIT_ERROR',
  PORT_CONFLICT = 'PORT_CONFLICT',
  DEPLOY_ERROR = 'DEPLOY_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  REPO_CREATE_FAILED = 'REPO_CREATE_FAILED',
  REPO_DELETE_FAILED = 'REPO_DELETE_FAILED',
  DEPLOYMENT_DELETE_FAILED = 'DEPLOYMENT_DELETE_FAILED',
  LOGS_FETCH_FAILED = 'LOGS_FETCH_FAILED',
  PM2_START_FAILED = 'PM2_START_FAILED',
  PM2_STOP_FAILED = 'PM2_STOP_FAILED',
  PM2_RESTART_FAILED = 'PM2_RESTART_FAILED',
}

export interface ServiceConfig {
  root?: string;
  install?: string;
  build: string;
  start: string;
  depends?: string[];
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
  services: Services;
  links?: Record<string, Record<string, string>>;
  env?: Record<string, Record<string, string>>;
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

export interface DeploymentResponse {
  repo: string;
  branch: string;
  deploymentId: string;
  services: Record<string, number>;
  processes: PM2Process[];
}

export interface DeployResponse {
  success: true;
  branch: string;
  commit: string;
  services: Record<string, { port: number }>;
  duration: number;
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
    details?: string;
    logs?: string;
    step?: number;
    stage?: DeployStage | string;
    service?: string;
    rollback?: RollbackStatus;
  };
  duration: number;
}

export interface LogEntry {
  service: string;
  level: LogEntryLevel;
  message: string;
  timestamp: string;
}

export interface LogsResponse {
  logs: LogEntry[];
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
