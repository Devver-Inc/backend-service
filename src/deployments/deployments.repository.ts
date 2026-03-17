import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeploymentDomain } from './deployment.domain';
import {
  Deployment,
  DeploymentDocument,
  DeploymentStatus,
} from './deployment.schema';

@Injectable()
export class DeploymentsRepository {
  private readonly DEPLOYMENT_NOT_FOUND = 'DEPLOYMENT_NOT_FOUND';

  constructor(
    @InjectModel(Deployment.name)
    private readonly deploymentModel: Model<DeploymentDocument>,
  ) {}

  async create(domain: DeploymentDomain): Promise<DeploymentDocument> {
    const deployment = new this.deploymentModel({
      organizationId: domain.organizationId,
      project: domain.projectId,
      organizationName: domain.organizationName,
      projectName: domain.projectName,
      organizationDomain: domain.organizationDomain,
      container: domain.container,
      resources: domain.resources,
      persistence: domain.persistence,
      replicaCount: domain.replicaCount,
      ports: domain.ports,
      labels: domain.labels,
      annotations: domain.annotations,
      githubPath: domain.githubPath,
      status: domain.status,
    });

    return deployment.save();
  }

  async findById(id: string): Promise<DeploymentDocument> {
    return this.deploymentModel
      .findById(id)
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();
  }

  findByOrganizationAndProject = (
    organizationId: string,
    projectId: string,
  ): Promise<DeploymentDocument | null> =>
    this.deploymentModel
      .findOne({
        organizationId,
        project: new Types.ObjectId(projectId),
      })
      .exec();

  findByOrganizationId = (
    organizationId: string,
  ): Promise<DeploymentDocument[]> =>
    this.deploymentModel.find({ organizationId }).exec();

  findByProjectId = (projectId: string): Promise<DeploymentDocument[]> =>
    this.deploymentModel
      .find({ project: new Types.ObjectId(projectId) })
      .exec();

  async updateStatus(
    id: string,
    status: DeploymentStatus,
  ): Promise<DeploymentDocument> {
    return this.deploymentModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();
  }

  async update(
    id: string,
    domain: DeploymentDomain,
  ): Promise<DeploymentDocument> {
    return this.deploymentModel
      .findByIdAndUpdate(
        id,
        {
          organizationName: domain.organizationName,
          projectName: domain.projectName,
          organizationDomain: domain.organizationDomain,
          container: domain.container,
          resources: domain.resources,
          persistence: domain.persistence,
          replicaCount: domain.replicaCount,
          ports: domain.ports,
          labels: domain.labels,
          annotations: domain.annotations,
          githubPath: domain.githubPath,
          status: domain.status,
        },
        { new: true },
      )
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.deploymentModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException(this.DEPLOYMENT_NOT_FOUND))
      .exec();
  }

  deleteByProject = (projectId: string): Promise<void> =>
    this.deploymentModel
      .deleteMany({ project: new Types.ObjectId(projectId) })
      .exec()
      .then(() => {});
}
