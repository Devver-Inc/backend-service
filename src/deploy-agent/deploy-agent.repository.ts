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
import { LeanWithMongoId } from 'src/_utils/types';
export type { CreateRepoData, CreateDeploymentData };

export type DeployRepoLean = LeanWithMongoId<DeployRepo>;
export type DeploymentLean = LeanWithMongoId<Deployment>;

@Injectable()
export class DeployAgentRepository {
  REPO_NOT_FOUND = 'REPO_NOT_FOUND';
  DEPLOYMENT_NOT_FOUND = 'DEPLOYMENT_NOT_FOUND';

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
      .orFail(new NotFoundException(this.REPO_NOT_FOUND))
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
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();

  findDeploymentsByProject = async (
    projectId: string,
    status?: DeploymentStatus,
  ): Promise<DeploymentLean[]> => {
    const filter: Record<string, unknown> = { projectId };
    if (status) filter.status = status;
    return this.deploymentModel.find(filter).lean().exec();
  };

  findActiveDeploymentsByProject = (
    projectId: string,
  ): Promise<DeploymentLean[]> =>
    this.deploymentModel
      .find({ projectId, status: { $ne: DeploymentStatus.REMOVED } })
      .lean()
      .exec();

  markDeploymentRemoved = async (
    projectId: string,
    repo: string,
    branch: string,
  ): Promise<void> => {
    await this.deploymentModel
      .updateOne(
        { projectId, repo, branch },
        { $set: { status: DeploymentStatus.REMOVED } },
      )
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();
  };

  markDeploymentRemovedById = async (id: string): Promise<void> => {
    await this.deploymentModel
      .updateOne({ _id: id }, { $set: { status: DeploymentStatus.REMOVED } })
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();
  };

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
