export enum ManifestStatus {
  PENDING = 'pending',
  PUSHED = 'pushed',
  FAILED = 'failed',
}

export enum DatabaseType {
  MONGO = 'mongo',
  POSTGRES = 'postgres',
  REDIS = 'redis',
}

export const DATABASE_CONNECTION_ENV: Record<DatabaseType, string> = {
  [DatabaseType.MONGO]: 'DEVVER_MONGO_CONNECTION_STRING',
  [DatabaseType.POSTGRES]: 'DEVVER_POSTGRES_CONNECTION_STRING',
  [DatabaseType.REDIS]: 'DEVVER_REDIS_CONNECTION_STRING',
};

export interface DatabaseLink {
  env: string;
  engine: DatabaseType;
  database: string;
}

export enum OverlayCommentPermission {
  TEAM_ONLY = 'team_only',
  EMAIL_REQUIRED = 'email_required',
}

export interface MachineConfiguration {
  cpuCores: number;
  ram: number;
}

export interface OverlayAccessControl {
  commentPermission: OverlayCommentPermission;
}

export interface DeploymentConfig {
  githubPath: string;
  manifestStatus: ManifestStatus;
}

export interface DatabaseDeploymentConfig {
  name: string;
  type: DatabaseType;
  enabled: boolean;
  githubPath: string;
  manifestStatus: ManifestStatus;
  username: string;
  passwordEncrypted: string;
  replicaCount: number;
  ram: number;
  cpuCores: number;
  storage: number;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  machineConfiguration?: MachineConfiguration;
  teamMemberIds?: string[];
  overlayAccessControl: OverlayAccessControl;
  databaseConfigurations?: {
    type: DatabaseType;
    username: string;
    replicaCount: number;
    ram: number;
    cpuCores: number;
    storage: number;
  }[];
}

export interface UpdateProjectData {
  description?: string;
  machineConfiguration?: Partial<MachineConfiguration>;
  overlayAccessControl?: Partial<OverlayAccessControl>;
}

export interface CommentAuthorization {
  allowed: boolean;
  emailToPersist?: string;
}

export interface ProjectDomainProps {
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  machineConfiguration: MachineConfiguration;
  teamMemberIds: string[];
  overlayAccessControl: OverlayAccessControl;
  deploymentConfig?: DeploymentConfig;
  databaseConfigurations?: DatabaseDeploymentConfig[];
}
