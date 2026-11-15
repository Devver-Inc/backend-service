import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpsertDeploymentData } from './_utils/types/deployment.types';
import { Deployment, DeploymentDocument } from './schemas/deployment.schema';
import { LeanWithMongoId } from 'src/_utils/types';

export type DeploymentLean = LeanWithMongoId<Deployment>;

@Injectable()
export class DeployAgentRepository {
  constructor(
    @InjectModel(Deployment.name) private deploymentModel: Model<Deployment>,
  ) {}

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
}
