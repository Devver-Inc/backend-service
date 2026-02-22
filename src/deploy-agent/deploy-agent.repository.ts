import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateDeploymentData,
  CreateRepoData,
  DeploymentStatus,
} from './_utils/types/deployment.types';
import { Deployment, DeploymentDocument } from './schemas/deployment.schema';
import { DeployRepo, DeployRepoDocument } from './schemas/repo.schema';

export type { CreateRepoData, CreateDeploymentData };

@Injectable()
export class DeployAgentRepository {
  NOT_FOUND_ERROR = 'REPO_NOT_FOUND';

  constructor(
    @InjectModel(DeployRepo.name) private repoModel: Model<DeployRepo>,
    @InjectModel(Deployment.name) private deploymentModel: Model<Deployment>,
  ) {}

  createRepo = (data: CreateRepoData): Promise<DeployRepoDocument> =>
    this.repoModel.create(data);

  findReposByProject = (projectId: string): Promise<DeployRepoDocument[]> =>
    this.repoModel.find({ projectId }).exec();

  findRepo = (
    projectId: string,
    name: string,
  ): Promise<DeployRepoDocument | null> =>
    this.repoModel
      .findOne({ projectId, name })
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();

  deleteRepo = (projectId: string, name: string): Promise<void> =>
    this.repoModel
      .deleteOne({ projectId, name })
      .exec()
      .then(() => {});

  upsertDeployment = (
    data: CreateDeploymentData & { status: DeploymentStatus },
  ): Promise<DeploymentDocument> =>
    this.deploymentModel
      .findOneAndUpdate(
        { projectId: data.projectId, repo: data.repo, branch: data.branch },
        { $set: { ...data } },
        { upsert: true, new: true },
      )
      .exec();

  findDeploymentsByProject = async (
    projectId: string,
    status?: DeploymentStatus,
  ): Promise<DeploymentDocument[]> => {
    const filter: Record<string, unknown> = { projectId };
    if (status) filter.status = status;
    return this.deploymentModel.find(filter).exec();
  };

  findActiveDeploymentsByProject = (
    projectId: string,
  ): Promise<DeploymentDocument[]> =>
    this.deploymentModel
      .find({ projectId, status: { $ne: DeploymentStatus.REMOVED } })
      .exec();

  markDeploymentRemoved = (
    projectId: string,
    repo: string,
    branch: string,
  ): Promise<void> =>
    this.deploymentModel
      .updateOne(
        { projectId, repo, branch },
        { $set: { status: DeploymentStatus.REMOVED } },
      )
      .exec()
      .then(() => {});

  markDeploymentsByRepoRemoved = (
    projectId: string,
    repo: string,
  ): Promise<void> =>
    this.deploymentModel
      .updateMany(
        { projectId, repo },
        { $set: { status: DeploymentStatus.REMOVED } },
      )
      .exec()
      .then(() => {});
}
