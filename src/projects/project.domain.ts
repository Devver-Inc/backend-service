// project.domain.ts
import * as yaml from 'js-yaml';
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
      container: {
        image: dto.container.image,
        port: dto.container.port,
        type: dto.container.type as 'app' | 'os',
        command: dto.container.command ?? [],
        args: dto.container.args ?? [],
      },
      resources: {
        requests: {
          memory: dto.resources?.requests?.memory ?? '128Mi',
          cpu: dto.resources?.requests?.cpu ?? '100m',
        },
        limits: {
          memory: dto.resources?.limits?.memory ?? '128Mi',
          cpu: dto.resources?.limits?.cpu ?? '100m',
        },
      },
      persistence: {
        enabled: dto.persistence?.enabled ?? false,
        app: dto.persistence?.app,
        root: dto.persistence?.root,
      },
      replicaCount: dto.replicaCount ?? 1,
      ports: {
        http: dto.httpPort ?? 80,
        https: dto.httpsPort ?? 443,
      },
      labels: new Map(Object.entries(dto.labels ?? {})),
      annotations: new Map(Object.entries(dto.annotations ?? {})),
      organizationDomain: dto.organizationDomain ?? 'devver.app',
      githubPath,
      status: DeploymentStatus.PENDING,
    };

    return new ProjectDomain({
      name: dto.name,
      description: dto.description,
      organizationId,
      createdBy: userId,
      machineConfiguration: {
        cpuCores: dto.machineConfiguration?.cpuCores ?? 2,
        ram: dto.machineConfiguration?.ram ?? 4,
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

  toValuesYaml(organizationName: string): string {
    if (!this.deploymentConfig) {
      throw new Error('Project has no deployment configuration');
    }

    const cfg = this.deploymentConfig;

    const toRecord = (
      map: Map<string, string> | Record<string, string> | undefined,
    ): Record<string, string> => {
      if (!map) return {};
      if (map instanceof Map) return Object.fromEntries(map.entries());
      return map;
    };

    const obj = {
      organization: {
        name: organizationName,
        domain: cfg.organizationDomain,
      },
      project: {
        name: this.name,
      },
      imagePullSecrets: [{ name: 'ghcr-secret' }],
      container: {
        image: cfg.container.image,
        port: cfg.container.port,
        type: cfg.container.type,
        command: cfg.container.command ?? [],
        args: cfg.container.args ?? [],
      },
      resources: {
        requests: {
          memory: cfg.resources.requests.memory,
          cpu: cfg.resources.requests.cpu,
        },
        limits: {
          memory: cfg.resources.limits.memory,
          cpu: cfg.resources.limits.cpu,
        },
      },
      persistence: {
        enabled: cfg.persistence.enabled,
        ...(cfg.persistence.app ? { app: cfg.persistence.app } : {}),
        ...(cfg.persistence.root ? { root: cfg.persistence.root } : {}),
      },
      replicaCount: cfg.replicaCount,
      ports: {
        http: cfg.ports.http,
        https: cfg.ports.https,
      },
      labels: toRecord(cfg.labels as unknown as Map<string, string>),
      annotations: toRecord(cfg.annotations as unknown as Map<string, string>),
    };

    return yaml.dump(obj);
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
