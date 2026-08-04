export enum ManifestStatus {
  PENDING = 'pending',
  PUSHED = 'pushed',
  FAILED = 'failed',
}

export enum DatabaseType {
  MONGO = 'mongo',
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
  type: DatabaseType;
  enabled: boolean;
  githubPath: string;
  manifestStatus: ManifestStatus;
  rootUsername: string;
  rootPasswordEncrypted: string;
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
  databaseConfiguration?: {
    type: DatabaseType;
    rootUsername: string;
    replicaCount: number;
    ram: number;
    cpuCores: number;
    storage: number;
  };
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
  databaseConfiguration?: DatabaseDeploymentConfig;
}
