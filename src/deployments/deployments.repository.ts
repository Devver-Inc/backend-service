import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeploymentDomain } from './deployment.domain';
import { Deployment, DeploymentDocument } from './deployment.schema';

@Injectable()
export class DeploymentsRepository {
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
    const deployment = await this.deploymentModel.findById(id).exec();

    if (!deployment) {
      throw new NotFoundException(`Deployment with id ${id} not found`);
    }

    return deployment;
  }

  async findByOrganizationAndProject(
    organizationId: string,
    projectId: string,
  ): Promise<DeploymentDocument | null> {
    return this.deploymentModel
      .findOne({
        organizationId: organizationId,
        project: projectId as any,
      })
      .exec();
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<DeploymentDocument[]> {
    return this.deploymentModel.find({ organizationId }).exec();
  }

  async findByProjectId(projectId: string): Promise<DeploymentDocument[]> {
    return this.deploymentModel.find({ project: projectId as any }).exec();
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'deployed' | 'failed',
  ): Promise<DeploymentDocument> {
    const deployment = await this.deploymentModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!deployment) {
      throw new NotFoundException(`Deployment with id ${id} not found`);
    }

    return deployment;
  }

  async update(
    id: string,
    domain: DeploymentDomain,
  ): Promise<DeploymentDocument> {
    const deployment = await this.deploymentModel
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
      .exec();

    if (!deployment) {
      throw new NotFoundException(`Deployment with id ${id} not found`);
    }

    return deployment;
  }

  async delete(id: string): Promise<void> {
    const result = await this.deploymentModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Deployment with id ${id} not found`);
    }
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.deploymentModel.deleteMany({ project: projectId as any }).exec();
  }
}
