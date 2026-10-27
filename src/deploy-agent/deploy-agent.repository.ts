import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateRepoData,
  UpsertDeploymentData,
} from './_utils/types/deployment.types';
import { Deployment, DeploymentDocument } from './schemas/deployment.schema';
import { DeployRepo, DeployRepoDocument } from './schemas/repo.schema';
import { LeanWithMongoId } from 'src/_utils/types';

export type DeployRepoLean = LeanWithMongoId<DeployRepo>;
export type DeploymentLean = LeanWithMongoId<Deployment>;

@Injectable()
export class DeployAgentRepository {
  constructor(
    @InjectModel(DeployRepo.name) private repoModel: Model<DeployRepo>,
    @InjectModel(Deployment.name) private deploymentModel: Model<Deployment>,
  ) {}

  createRepo = (data: CreateRepoData): Promise<DeployRepoDocument> =>
    this.repoModel.create(data);

  findReposByProject = (projectId: string): Promise<DeployRepoLean[]> =>
    this.repoModel.find({ projectId }).lean().exec();

  findRepo = (projectId: string, name: string): Promise<DeployRepoDocument> =>
    this.repoModel
      .findOne({ projectId, name })
      .orFail(new NotFoundException('REPO_NOT_FOUND'))
      .exec();

  deleteRepo = (projectId: string, name: string): Promise<void> =>
    this.repoModel
      .deleteOne({ projectId, name })
      .exec()
      .then(() => {});

  upsertDeployment = (
    data: UpsertDeploymentData,
  ): Promise<DeploymentDocument> =>
    this.deploymentModel
      .findOneAndUpdate(
        { projectId: data.projectId, deploymentId: data.deploymentId },
        { $set: data },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

  findDeployments = (
    filter: { projectId: string; repo?: string } | { organizationId: string },
  ): Promise<DeploymentLean[]> =>
    this.deploymentModel.find(filter).lean().exec();

  deleteDeployment = (projectId: string, deploymentId: string): Promise<void> =>
    this.deploymentModel
      .deleteOne({ projectId, deploymentId })
      .orFail(new NotFoundException('DEPLOYMENT_NOT_FOUND'))
      .exec()
      .then(() => {});

  deleteDeployments = (
    filter: { projectId: string; repo?: string } | { organizationId: string },
  ): Promise<void> =>
    this.deploymentModel
      .deleteMany(filter)
      .exec()
      .then(() => {});

  deleteRepos = (
    filter: { projectId: string } | { organizationId: string },
  ): Promise<void> =>
    this.repoModel
      .deleteMany(filter)
      .exec()
      .then(() => {});
}
