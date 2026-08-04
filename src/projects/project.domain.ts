import { toSlug } from 'src/_utils/functions/to-slug.function';
import {
  CommentAuthorization,
  CreateProjectData,
  DatabaseDeploymentConfig,
  DeploymentConfig,
  MachineConfiguration,
  ManifestStatus,
  OverlayAccessControl,
  OverlayCommentPermission,
  ProjectDomainProps,
  UpdateProjectData,
} from './project.types';

export class ProjectDomain {
  readonly name: string;
  readonly description?: string;
  readonly organizationId: string;
  readonly createdBy: string;
  readonly machineConfiguration: MachineConfiguration;
  readonly teamMemberIds: string[];
  readonly overlayAccessControl: OverlayAccessControl;
  readonly deploymentConfig?: DeploymentConfig;
  readonly databaseConfiguration?: DatabaseDeploymentConfig;

  private constructor(props: ProjectDomainProps) {
    this.name = props.name;
    this.description = props.description;
    this.organizationId = props.organizationId;
    this.createdBy = props.createdBy;
    this.machineConfiguration = props.machineConfiguration;
    this.teamMemberIds = props.teamMemberIds;
    this.overlayAccessControl = props.overlayAccessControl;
    this.deploymentConfig = props.deploymentConfig;
    this.databaseConfiguration = props.databaseConfiguration;
  }

  static create(
    dto: CreateProjectData,
    organizationId: string,
    userId: string,
    organizationName: string,
    encryptedMongoRootPassword?: string,
  ): ProjectDomain {
    const githubPath = `${toSlug(organizationName)}/${toSlug(dto.name)}/values.yaml`;

    const deploymentConfig: DeploymentConfig = {
      githubPath,
      manifestStatus: ManifestStatus.PENDING,
    };

    if (dto.databaseConfiguration && !encryptedMongoRootPassword) {
      throw new Error(
        'encryptedMongoRootPassword is required when databaseConfiguration is provided',
      );
    }

    const databaseConfiguration = dto.databaseConfiguration
      ? {
          type: dto.databaseConfiguration.type,
          enabled: true,
          githubPath: `${toSlug(organizationName)}/${toSlug(dto.name)}/values-db.yaml`,
          manifestStatus: ManifestStatus.PENDING,
          rootUsername: dto.databaseConfiguration.rootUsername,
          rootPasswordEncrypted: encryptedMongoRootPassword as string,
          replicaCount: dto.databaseConfiguration.replicaCount,
          ram: dto.databaseConfiguration.ram,
          cpuCores: dto.databaseConfiguration.cpuCores,
          storage: dto.databaseConfiguration.storage,
        }
      : undefined;

    return new ProjectDomain({
      name: dto.name,
      description: dto.description,
      organizationId,
      createdBy: userId,
      machineConfiguration: {
        cpuCores: dto.machineConfiguration?.cpuCores ?? 0.5,
        ram: dto.machineConfiguration?.ram ?? 0.5,
      },
      teamMemberIds: dto.teamMemberIds ?? [],
      overlayAccessControl: dto.overlayAccessControl,
      deploymentConfig,
      databaseConfiguration,
    });
  }

  static from(props: ProjectDomainProps): ProjectDomain {
    return new ProjectDomain(props);
  }

  setDeploymentConfig(config: DeploymentConfig): ProjectDomain {
    return new ProjectDomain({ ...this, deploymentConfig: config });
  }

  setDatabaseConfig(config: DatabaseDeploymentConfig): ProjectDomain {
    return new ProjectDomain({ ...this, databaseConfiguration: config });
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  isTeamMember(userId: string): boolean {
    return this.teamMemberIds.includes(userId);
  }

  authorizeRead(userId: string | undefined, isAdmin: boolean): boolean {
    const isTeamMember = userId !== undefined && this.isTeamMember(userId);

    switch (this.overlayAccessControl.commentPermission) {
      case OverlayCommentPermission.TEAM_ONLY:
        return isAdmin || isTeamMember;
      case OverlayCommentPermission.EMAIL_REQUIRED:
        return true;
      default:
        return false;
    }
  }

  authorizeComment(
    userId: string | undefined,
    isAdmin: boolean,
    providedEmail?: string,
  ): CommentAuthorization {
    const isTeamMember = userId !== undefined && this.isTeamMember(userId);

    switch (this.overlayAccessControl.commentPermission) {
      case OverlayCommentPermission.TEAM_ONLY:
        if (isAdmin || isTeamMember) return { allowed: true };
        return { allowed: false };

      case OverlayCommentPermission.EMAIL_REQUIRED:
        if (isAdmin || isTeamMember) return { allowed: true };
        if (!providedEmail) return { allowed: false };
        return { allowed: true, emailToPersist: providedEmail };

      default:
        return { allowed: false };
    }
  }

  addTeamMembers(userIds: string[]): ProjectDomain {
    const existingIds = new Set(this.teamMemberIds);
    const newIds = userIds.filter((id) => !existingIds.has(id));

    return new ProjectDomain({
      ...this,
      teamMemberIds: [...this.teamMemberIds, ...newIds],
    });
  }

  removeTeamMember(userId: string): ProjectDomain {
    return new ProjectDomain({
      ...this,
      teamMemberIds: this.teamMemberIds.filter((id) => id !== userId),
    });
  }

  update(dto: UpdateProjectData): ProjectDomain {
    return new ProjectDomain({
      ...this,
      description: dto.description ?? this.description,
      machineConfiguration: dto.machineConfiguration
        ? { ...this.machineConfiguration, ...dto.machineConfiguration }
        : this.machineConfiguration,
      overlayAccessControl: dto.overlayAccessControl
        ? { ...this.overlayAccessControl, ...dto.overlayAccessControl }
        : this.overlayAccessControl,
    });
  }
}
