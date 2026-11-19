import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DeploymentRecordStatus,
  NewDeploymentData,
} from './_utils/types/deployment.types';
import { Deployment, DeploymentDocument } from './schemas/deployment.schema';
import { LeanWithMongoId } from 'src/_utils/types';

export type DeploymentLean = LeanWithMongoId<Deployment>;

@Injectable()
export class DeployAgentRepository {
  constructor(
    @InjectModel(Deployment.name) private deploymentModel: Model<Deployment>,
  ) {}

  createDeployment = (data: NewDeploymentData): Promise<DeploymentDocument> =>
    this.deploymentModel.create({ ...data, status: 'preparing' });

  markDeployment = (
    projectId: string,
    deploymentId: string,
    status: DeploymentRecordStatus,
    stage: string | null = null,
  ): Promise<void> =>
    this.deploymentModel
      .updateOne(
        { projectId, deploymentId },
        {
          $set: {
            status,
            stage,
            ...(status === 'ready' && { deployedAt: new Date() }),
          },
        },
      )
      .exec()
      .then(() => {});

  amendDeployment = (
    projectId: string,
    deploymentId: string,
    code: Pick<
      NewDeploymentData,
      'commit' | 'serviceName' | 'service' | 'dbLinks' | 'branch'
    >,
  ): Promise<void> =>
    this.deploymentModel
      .updateOne(
        { projectId, deploymentId },
        {
          $set: {
            ...code,
            status: 'ready',
            stage: null,
            deployedAt: new Date(),
          },
        },
      )
      .exec()
      .then(() => {});

  renameDeployment = (
    projectId: string,
    deploymentId: string,
    displayName: string,
  ): Promise<void> =>
    this.deploymentModel
      .updateOne({ projectId, deploymentId }, { $set: { displayName } })
      .orFail(new NotFoundException('DEPLOYMENT_NOT_FOUND'))
      .exec()
      .then(() => {});

  findDeployment = (
    projectId: string,
    deploymentId: string,
  ): Promise<DeploymentLean | null> =>
    this.deploymentModel.findOne({ projectId, deploymentId }).lean().exec();

  findDeployments = (
    filter:
      | { projectId: string; repo?: string; status?: DeploymentRecordStatus }
      | { organizationId: string },
  ): Promise<DeploymentLean[]> =>
    this.deploymentModel.find(filter).sort({ createdAt: 1 }).lean().exec();

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
}
