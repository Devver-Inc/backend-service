import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
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
  readonly databaseConfigurations?: DatabaseDeploymentConfig[];

  private constructor(props: ProjectDomainProps) {
    this.name = props.name;
    this.description = props.description;
    this.organizationId = props.organizationId;
    this.createdBy = props.createdBy;
    this.machineConfiguration = props.machineConfiguration;
    this.teamMemberIds = props.teamMemberIds;
    this.overlayAccessControl = props.overlayAccessControl;
    this.deploymentConfig = props.deploymentConfig;
    this.databaseConfigurations = props.databaseConfigurations;
  }

  static create(
    dto: CreateProjectData,
    organizationId: string,
    userId: string,
  ): ProjectDomain {
    const deploymentConfig: DeploymentConfig = {
      manifestStatus: ManifestStatus.PENDING,
    };

    const databaseConfigurations = dto.databaseConfigurations?.map(
      (configuration) => ({
        name: configuration.type,
        type: configuration.type,
        enabled: true,
        manifestStatus: ManifestStatus.PENDING,
        username: configuration.username,
        replicaCount: configuration.replicaCount,
        ram: configuration.ram,
        cpuCores: configuration.cpuCores,
        storage: configuration.storage,
      }),
    );

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
      databaseConfigurations,
    });
  }

  static from(props: ProjectDomainProps): ProjectDomain {
    return new ProjectDomain(props);
  }

  setDeploymentConfig(config: DeploymentConfig): ProjectDomain {
    return new ProjectDomain({ ...this, deploymentConfig: config });
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  isTeamMember(userId: string): boolean {
    return this.teamMemberIds.includes(userId);
  }

  /** Deploy and git push: org admins, or developers on the project's team. */
  canPush(userId: string, orgRoleNames: readonly string[]): boolean {
    if (orgRoleNames.includes(UserRoleEnum.ADMIN)) return true;
    return (
      orgRoleNames.includes(UserRoleEnum.DEVELOPER) && this.isTeamMember(userId)
    );
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
