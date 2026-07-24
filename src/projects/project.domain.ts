// project.domain.ts
import { dump } from 'js-yaml';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import {
  MachineConfiguration,
  DatabaseDeploymentConfig,
  OverlayAccessControl,
  OverlayCommentPermission,
  DeploymentConfig,
  ManifestStatus,
  ProjectDocument,
} from './project.schema';

interface CommentAuthorization {
  allowed: boolean;
  emailToPersist?: string;
}

interface ProjectDomainProps {
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

const DEFAULT_STORAGE_CLASS = 'nfs-devver-prod';

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
    dto: CreateProjectDto,
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

  static fromDocument(doc: ProjectDocument): ProjectDomain {
    return new ProjectDomain({
      name: doc.name,
      description: doc.description,
      organizationId: doc.organizationId,
      createdBy: doc.createdBy,
      machineConfiguration: doc.machineConfiguration,
      teamMemberIds: doc.teamMemberIds,
      overlayAccessControl: doc.overlayAccessControl,
      deploymentConfig: doc.deploymentConfig,
      databaseConfiguration: doc.databaseConfiguration,
    });
  }

  setDeploymentConfig(config: DeploymentConfig): ProjectDomain {
    return new ProjectDomain({ ...this, deploymentConfig: config });
  }

  setDatabaseConfig(config: DatabaseDeploymentConfig): ProjectDomain {
    return new ProjectDomain({ ...this, databaseConfiguration: config });
  }

  // TODO: migrate devverSecret injection to Vault (external secret reference) instead of inlining
  // plaintext in the values YAML pushed to GitHub.
  toValuesYaml(
    organizationName: string,
    devverSecret: string,
    databaseConnectionString?: string,
  ): string {
    if (!this.deploymentConfig) {
      throw new Error('Project has no deployment configuration');
    }

    const orgName = toSlug(organizationName);
    const projectName = toSlug(this.name);
    const memory = `${Math.round(this.machineConfiguration.ram * 1024)}Mi`;
    const cpu = `${Math.round(this.machineConfiguration.cpuCores * 1000)}m`;

    return dump({
      organization: { name: orgName, domain: 'devver.app' },
      project: { name: projectName },
      imagePullSecrets: [{ name: 'ghcr-secret' }],
      container: {
        image: 'ghcr.io/devver-inc/deploy-agent:latest',
        port: 80,
        type: 'app',
        command: [],
        args: [],
        env: {
          DEVVER_SECRET: devverSecret, // TODO: replace with Vault reference
          NODE_ENV: 'production',
          DEVVER_WIDGET_URL:
            'https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@dev/public/devver-overlay.iife.js', // TODO: change to main when ready
          ...(databaseConnectionString
            ? {
                DEVVER_MONGO_CONNECTION_STRING: databaseConnectionString,
              }
            : {}),
        },
      },
      resources: {
        requests: { memory, cpu },
        limits: { memory: '2Gi', cpu: '2000m' },
      },
      persistence: {
        enabled: true,
        app: {
          size: '5Gi',
          mountPath: '/app',
          storageClass: DEFAULT_STORAGE_CLASS,
        },
        root: {
          size: '5Gi',
          mountPath: '/root',
          storageClass: DEFAULT_STORAGE_CLASS,
        },
      },
      replicaCount: 1,
      ports: { http: 80, https: 443 },
      labels: {},
      annotations: {},
    });
  }

  // TODO: migrate rootPassword injection to Vault (external secret reference) instead of inlining
  // plaintext in the values YAML pushed to GitHub.
  toMongoValuesYaml(organizationName: string, rootPassword: string): string {
    if (!this.databaseConfiguration) {
      throw new Error('Project has no database deployment configuration');
    }

    const orgName = toSlug(organizationName);
    const projectName = toSlug(this.name);
    const memory = `${Math.round(this.databaseConfiguration.ram * 1024)}Mi`;
    const cpu = `${Math.round(this.databaseConfiguration.cpuCores * 1000)}m`;
    const storage = `${this.databaseConfiguration.storage}Gi`;

    return dump({
      namespace: { create: false },
      organization: { name: orgName, domain: 'devver.app' },
      project: { name: projectName },
      auth: {
        rootUsername: this.databaseConfiguration.rootUsername,
        rootPassword: rootPassword, // TODO: replace with Vault reference
      },
      replicaCount: this.databaseConfiguration.replicaCount,
      persistence: { size: storage, storageClass: DEFAULT_STORAGE_CLASS },
      resources: {
        requests: { memory, cpu },
        limits: { memory: '1Gi', cpu: '500m' },
      },
    });
  }

  buildDatabaseConnectionString(
    organizationName: string,
    rootPassword: string,
    targetDatabase = 'admin',
  ): string {
    if (!this.databaseConfiguration) {
      throw new Error('Project has no database deployment configuration');
    }

    const orgName = toSlug(organizationName);
    const projectName = toSlug(this.name);
    const username = encodeURIComponent(
      this.databaseConfiguration.rootUsername,
    );
    const password = encodeURIComponent(rootPassword);
    const host = `${orgName}-${projectName}-mongo`;
    const database = encodeURIComponent(targetDatabase);

    return `mongodb://${username}:${password}@${host}:27017/${database}?authSource=admin&tls=true&tlsAllowInvalidCertificates=true`;
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

  update(dto: UpdateProjectDto): ProjectDomain {
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
