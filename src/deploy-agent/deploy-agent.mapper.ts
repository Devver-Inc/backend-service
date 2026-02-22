import { Injectable } from '@nestjs/common';
import { GetDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeploymentDocument } from './schemas/deployment.schema';
import { DeployRepoDocument } from './schemas/repo.schema';

@Injectable()
export class DeployAgentMapper {
  toRepoDto = (doc: DeployRepoDocument): GetRepoDto => ({
    id: doc._id.toString(),
    name: doc.name,
    pushUrl: doc.pushUrl,
    projectId: doc.projectId,
    createdAt: doc.createdAt,
  });

  toDeploymentDto = (doc: DeploymentDocument): GetDeploymentDto => ({
    id: doc._id.toString(),
    repo: doc.repo,
    branch: doc.branch,
    commit: doc.commit ?? null,
    services: doc.services,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
