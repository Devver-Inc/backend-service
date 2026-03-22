import * as yaml from 'js-yaml';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { DeploymentDocument, DeploymentStatus } from './deployment.schema';

interface DeploymentDomainProps {
  organizationId: string;
  projectId: string;
  organizationName: string;
  projectName: string;
  organizationDomain?: string;
  container: {
    image: string;
    port: number;
    type: 'app' | 'os';
    command?: string[];
    args?: string[];
  };
  resources: {
    requests: {
      memory: string;
      cpu: string;
    };
    limits: {
      memory: string;
      cpu: string;
    };
  };
  persistence: {
    enabled: boolean;
    size?: string;
    mountPath?: string;
  };
  replicaCount: number;
  ports: {
    http: number;
    https: number;
  };
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  githubPath: string;
  status?: DeploymentStatus;
}

export class DeploymentDomain {
  readonly organizationId: string;
  readonly projectId: string;
  readonly organizationName: string;
  readonly projectName: string;
  readonly organizationDomain: string;
  readonly container: {
    image: string;
    port: number;
    type: 'app' | 'os';
    command?: string[];
    args?: string[];
  };
  readonly resources: {
    requests: {
      memory: string;
      cpu: string;
    };
    limits: {
      memory: string;
      cpu: string;
    };
  };
  readonly persistence: {
    enabled: boolean;
    size?: string;
    mountPath?: string;
  };
  readonly replicaCount: number;
  readonly ports: {
    http: number;
    https: number;
  };
  readonly labels: Record<string, string>;
  readonly annotations: Record<string, string>;
  readonly githubPath: string;
  readonly status: DeploymentStatus;

  private constructor(props: DeploymentDomainProps) {
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.organizationName = props.organizationName;
    this.projectName = props.projectName;
    this.organizationDomain = props.organizationDomain || 'devver.app';
    this.container = props.container;
    this.resources = props.resources;
    this.persistence = props.persistence;
    this.replicaCount = props.replicaCount;
    this.ports = props.ports;
    this.labels = props.labels || {};
    this.annotations = props.annotations || {};
    this.githubPath = props.githubPath;
    this.status = props.status ?? DeploymentStatus.PENDING;
  }

  static create(
    dto: CreateDeploymentDto,
    organizationId: string,
    projectId: string,
  ): DeploymentDomain {
    const githubPath = `${toSlug(dto.organizationName)}/${toSlug(dto.projectName)}/values.yaml`;

    return new DeploymentDomain({
      organizationId,
      projectId,
      organizationName: dto.organizationName,
      projectName: dto.projectName,
      organizationDomain: dto.organizationDomain,
      container: {
        image: dto.container.image,
        port: dto.container.port,
        type: dto.container.type,
        command: dto.container.command,
        args: dto.container.args,
      },
      resources: {
        requests: {
          memory: dto.resources.requestsMemory,
          cpu: dto.resources.requestsCpu,
        },
        limits: {
          memory: dto.resources.limitsMemory,
          cpu: dto.resources.limitsCpu,
        },
      },
      persistence: {
        enabled: dto.persistence.enabled,
        size: dto.persistence.size,
        mountPath: dto.persistence.mountPath,
      },
      replicaCount: dto.replicaCount,
      ports: {
        http: dto.httpPort || 80,
        https: dto.httpsPort || 443,
      },
      labels: dto.labels,
      annotations: dto.annotations,
      githubPath,
      status: DeploymentStatus.PENDING,
    });
  }

  static fromDocument(doc: DeploymentDocument): DeploymentDomain {
    const toRecord = (
      map: Map<string, string> | Record<string, string>,
    ): Record<string, string> => {
      if (map instanceof Map) {
        return Object.fromEntries(map.entries());
      }
      return map ?? {};
    };

    return new DeploymentDomain({
      organizationId: doc.organizationId,
      projectId: doc.project.toString(),
      organizationName: doc.organizationName,
      projectName: doc.projectName,
      organizationDomain: doc.organizationDomain,
      container: doc.container,
      resources: doc.resources,
      persistence: doc.persistence,
      replicaCount: doc.replicaCount,
      ports: doc.ports,
      labels: toRecord(doc.labels as unknown as Map<string, string>),
      annotations: toRecord(doc.annotations as unknown as Map<string, string>),
      githubPath: doc.githubPath,
      status: doc.status,
    });
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  update(dto: CreateDeploymentDto): DeploymentDomain {
    return new DeploymentDomain({
      ...this,
      organizationName: dto.organizationName,
      projectName: dto.projectName,
      organizationDomain: dto.organizationDomain ?? this.organizationDomain,
      container: {
        image: dto.container.image,
        port: dto.container.port,
        type: dto.container.type,
        command: dto.container.command,
        args: dto.container.args,
      },
      resources: {
        requests: {
          memory: dto.resources.requestsMemory,
          cpu: dto.resources.requestsCpu,
        },
        limits: {
          memory: dto.resources.limitsMemory,
          cpu: dto.resources.limitsCpu,
        },
      },
      persistence: {
        enabled: dto.persistence.enabled,
        size: dto.persistence.size,
        mountPath: dto.persistence.mountPath,
      },
      replicaCount: dto.replicaCount,
      ports: {
        http: dto.httpPort || 80,
        https: dto.httpsPort || 443,
      },
      labels: dto.labels ?? this.labels,
      annotations: dto.annotations ?? this.annotations,
    });
  }

  markAsDeployed(): DeploymentDomain {
    return new DeploymentDomain({ ...this, status: DeploymentStatus.DEPLOYED });
  }

  markAsFailed(): DeploymentDomain {
    return new DeploymentDomain({ ...this, status: DeploymentStatus.FAILED });
  }

  toValuesYaml(): string {
    const obj = {
      organization: {
        name: this.organizationName,
        domain: this.organizationDomain,
      },
      project: {
        name: this.projectName,
      },
      container: {
        image: this.container.image,
        port: this.container.port,
        type: this.container.type,
        command:
          this.container.command && this.container.command.length > 0
            ? this.container.command
            : [],
        args:
          this.container.args && this.container.args.length > 0
            ? this.container.args
            : [],
      },
      resources: {
        requests: {
          memory: this.resources.requests.memory,
          cpu: this.resources.requests.cpu,
        },
        limits: {
          memory: this.resources.limits.memory,
          cpu: this.resources.limits.cpu,
        },
      },
      persistence: {
        enabled: this.persistence.enabled,
        ...(this.persistence.size ? { size: this.persistence.size } : {}),
        ...(this.persistence.mountPath
          ? { mountPath: this.persistence.mountPath }
          : {}),
      },
      replicaCount: this.replicaCount,
      ports: {
        http: this.ports.http,
        https: this.ports.https,
      },
      labels: Object.keys(this.labels).length > 0 ? this.labels : {},
      annotations:
        Object.keys(this.annotations).length > 0 ? this.annotations : {},
    };

    return yaml.dump(obj);
  }
}
