import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';

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
  status?: 'pending' | 'deployed' | 'failed';
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
  readonly status: 'pending' | 'deployed' | 'failed';

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
    this.status = props.status || 'pending';
  }

  static create(
    dto: CreateDeploymentDto,
    organizationId: string,
    projectId: string,
  ): DeploymentDomain {
    const githubPath = `${dto.organizationName}/${dto.projectName}/values.yaml`;

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
      status: 'pending',
    });
  }
}
