import { Injectable } from '@nestjs/common';
import { DocOrLean } from 'src/_utils/types';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { Deployment } from './schemas/deployment.schema';
import { DeployRepo } from './schemas/repo.schema';

@Injectable()
export class DeployAgentMapper {
  toRepoDto = (doc: DocOrLean<DeployRepo>): GetRepoDto => ({
    id: doc._id.toString(),
    name: doc.name,
    pushUrl: doc.pushUrl,
    projectId: doc.projectId,
    createdAt: doc.createdAt,
  });

  toDeploymentDto = (doc: DocOrLean<Deployment>): GetAgentDeploymentDto => ({
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
