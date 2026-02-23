import { Injectable } from '@nestjs/common';
import {
  GetDeploymentDto,
  GetDeploymentLightDto,
} from './_utils/dto/responses/get-deployment.dto';
import { DeploymentDocument } from './deployment.schema';

@Injectable()
export class DeploymentMapper {
  toGetDeploymentDto = (deployment: DeploymentDocument): GetDeploymentDto => {
    return {
      id: deployment._id.toString(),
      organizationId: deployment.organizationId,
      projectId:
        typeof deployment.project === 'string'
          ? deployment.project
          : deployment.project._id.toString(),
      organizationName: deployment.organizationName,
      projectName: deployment.projectName,
      organizationDomain: deployment.organizationDomain,
      container: {
        image: deployment.container.image,
        port: deployment.container.port,
        type: deployment.container.type,
        command: deployment.container.command,
        args: deployment.container.args,
      },
      resources: {
        requests: {
          memory: deployment.resources.requests.memory,
          cpu: deployment.resources.requests.cpu,
        },
        limits: {
          memory: deployment.resources.limits.memory,
          cpu: deployment.resources.limits.cpu,
        },
      },
      persistence: {
        enabled: deployment.persistence.enabled,
        size: deployment.persistence.size,
        mountPath: deployment.persistence.mountPath,
      },
      replicaCount: deployment.replicaCount,
      ports: {
        http: deployment.ports.http,
        https: deployment.ports.https,
      },
      labels: Object.fromEntries(deployment.labels),
      annotations: Object.fromEntries(deployment.annotations),
      githubPath: deployment.githubPath,
      status: deployment.status,
      createdAt: (deployment as any).createdAt,
      updatedAt: (deployment as any).updatedAt,
    };
  };

  toGetDeploymentLightDto = (
    deployment: DeploymentDocument,
  ): GetDeploymentLightDto => {
    return {
      id: deployment._id.toString(),
      organizationName: deployment.organizationName,
      projectName: deployment.projectName,
      containerImage: deployment.container.image,
      status: deployment.status,
      replicaCount: deployment.replicaCount,
      githubPath: deployment.githubPath,
      createdAt: (deployment as any).createdAt,
      updatedAt: (deployment as any).updatedAt,
    };
  };
}
