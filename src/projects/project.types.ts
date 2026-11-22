export enum ManifestStatus {
  PENDING = 'pending',
  PUSHED = 'pushed',
  FAILED = 'failed',
}

export enum DatabaseType {
  MONGO = 'mongo',
  POSTGRES = 'postgres',
  VALKEY = 'valkey',
}

export enum DatabaseSize {
  S = 's',
  M = 'm',
  L = 'l',
}

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
  manifestStatus: ManifestStatus;
}

export interface DatabaseDeploymentConfig {
  name: string;
  type: DatabaseType;
  enabled: boolean;
  manifestStatus: ManifestStatus;
  version: string;
  /** Kept with the database: a version can leave the catalog while bases still run it. */
  tag: string;
  size: DatabaseSize;
  /** Set at creation: a StatefulSet's volume claim cannot change afterwards. */
  disk: string;
}

export interface DatabaseRequest {
  type: DatabaseType;
  version?: string;
  size?: DatabaseSize;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  machineConfiguration?: MachineConfiguration;
  teamMemberIds?: string[];
  overlayAccessControl: OverlayAccessControl;
  databaseConfigurations?: DatabaseRequest[];
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
