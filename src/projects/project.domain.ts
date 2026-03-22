// project.domain.ts
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import {
  MachineConfiguration,
  AccessControl,
  DeploymentConfig,
  DeploymentStatus,
  ProjectDocument,
} from './project.schema';

interface ProjectDomainProps {
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  machineConfiguration: MachineConfiguration;
  teamMemberIds: string[];
  accessControl: AccessControl;
  deploymentConfig?: DeploymentConfig;
}

export class ProjectDomain {
  readonly name: string;
  readonly description?: string;
  readonly organizationId: string;
  readonly createdBy: string;
  readonly machineConfiguration: MachineConfiguration;
  readonly teamMemberIds: string[];
  readonly accessControl: AccessControl;
  readonly deploymentConfig?: DeploymentConfig;

  private constructor(props: ProjectDomainProps) {
    this.name = props.name;
    this.description = props.description;
    this.organizationId = props.organizationId;
    this.createdBy = props.createdBy;
    this.machineConfiguration = props.machineConfiguration;
    this.teamMemberIds = props.teamMemberIds;
    this.accessControl = props.accessControl;
    this.deploymentConfig = props.deploymentConfig;
  }

  static create(
    dto: CreateProjectDto,
    organizationId: string,
    userId: string,
    organizationName: string,
  ): ProjectDomain {
    const githubPath = `${toSlug(organizationName)}/${toSlug(dto.name)}/values.yaml`;

    const deploymentConfig: DeploymentConfig = {
      githubPath,
      status: DeploymentStatus.PENDING,
    };

    return new ProjectDomain({
      name: dto.name,
      description: dto.description,
      organizationId,
      createdBy: userId,
      machineConfiguration: {
        cpuCores: dto.machineConfiguration?.cpuCores ?? 0.5,
        ram: dto.machineConfiguration?.ram ?? 0.5,
        storage: dto.machineConfiguration?.storage ?? 20,
      },
      teamMemberIds: dto.teamMemberIds ?? [],
      accessControl: {
        requireEmailAuth: dto.accessControl?.requireEmailAuth ?? true,
        publicAccess: dto.accessControl?.publicAccess ?? false,
        restrictToTeamMembers:
          dto.accessControl?.restrictToTeamMembers ?? false,
      },
      deploymentConfig,
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
      accessControl: doc.accessControl,
      deploymentConfig: doc.deploymentConfig,
    });
  }

  setDeploymentConfig(config: DeploymentConfig): ProjectDomain {
    return new ProjectDomain({ ...this, deploymentConfig: config });
  }

  toValuesYaml(organizationName: string, devverSecret: string): string {
    if (!this.deploymentConfig) {
      throw new Error('Project has no deployment configuration');
    }

    const orgName = toSlug(organizationName);
    const projectName = toSlug(this.name);
    const memory = `${Math.round(this.machineConfiguration.ram * 1024)}Mi`;
    const cpu = `${Math.round(this.machineConfiguration.cpuCores * 1000)}m`;

    return [
      'organization:',
      `  name: "${orgName}"`,
      '  domain: "devver.app"',
      'project:',
      `  name: "${projectName}"`,
      'imagePullSecrets:',
      '  - name: "ghcr-secret"',
      'container:',
      '  image: "ghcr.io/devver-inc/deploy-agent:latest"',
      '  port: 80',
      '  type: "app"',
      '  command: []',
      '  args: []',
      '  env:',
      `    DEVVER_SECRET: "${devverSecret}"`,
      '    NODE_ENV: "production"',
      '    DEVVER_WIDGET_URL: "https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@main/public/devver-overlay.iife.js"',
      'resources:',
      '  requests:',
      '    memory: "128Mi"',
      '    cpu: "100m"',
      '  limits:',
      `    memory: "${memory}"`,
      `    cpu: "${cpu}"`,
      'persistence:',
      '  enabled: true',
      '  app:',
      '    size: "10Gi"',
      '    mountPath: "/app"',
      '    storageClass: longhorn',
      '  root:',
      '    size: "5Gi"',
      '    mountPath: "/root"',
      '    storageClass: longhorn',
      'replicaCount: 1',
      'ports:',
      '  http: 80',
      '  https: 443',
      'labels: {}',
      'annotations: {}',
    ].join('\n');
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  isTeamMember(userId: string): boolean {
    return this.teamMemberIds.includes(userId);
  }

  canUserComment(userId: string, isAdmin: boolean): boolean {
    if (!this.accessControl.restrictToTeamMembers) return true;
    if (isAdmin) return true;
    return this.isTeamMember(userId);
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
      name: dto.name ?? this.name,
      description: dto.description ?? this.description,
      teamMemberIds: dto.teamMemberIds ?? this.teamMemberIds,
      machineConfiguration: dto.machineConfiguration
        ? { ...this.machineConfiguration, ...dto.machineConfiguration }
        : this.machineConfiguration,
      accessControl: dto.accessControl
        ? { ...this.accessControl, ...dto.accessControl }
        : this.accessControl,
    });
  }
}
